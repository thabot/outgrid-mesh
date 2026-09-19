/**
 * Unit tests for D1QuotaCoalescingBuffer
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { D1QuotaCoalescingBuffer, type INodeStatusUpdate } from '../../../cloudflare/workers/d1Buffer';

describe('D1QuotaCoalescingBuffer (D1 Write Quota Optimization)', () => {
  let coalescer: D1QuotaCoalescingBuffer;

  beforeEach(() => {
    coalescer = new D1QuotaCoalescingBuffer();
  });

  it('should coalesce multiple rapid updates from the same node into a single write', () => {
    // 10 updates from node-01
    for (let i = 1; i <= 10; i++) {
      coalescer.enqueueUpdate({
        nodeId: 'node-01',
        publicKeyHex: 'pk01',
        h3Res7Index: 'h3_7_a',
        batteryLevel: 100 - i,
        role: 'GUEST_VICTIM',
        timestamp: 1000 + i * 10,
      });
    }

    // 5 updates from node-02
    for (let i = 1; i <= 5; i++) {
      coalescer.enqueueUpdate({
        nodeId: 'node-02',
        publicKeyHex: 'pk02',
        h3Res7Index: 'h3_7_b',
        batteryLevel: 90 - i,
        role: 'VERIFIED_RESPONDER',
        timestamp: 1000 + i * 10,
      });
    }

    // Pending count should be 2 (one per unique node)
    expect(coalescer.getPendingCount()).toBe(2);

    const batch = coalescer.flushBatch();
    expect(batch.length).toBe(2);
    // Node-01 should have latest battery value (90%)
    const node1 = batch.find(n => n.nodeId === 'node-01');
    expect(node1?.batteryLevel).toBe(90);

    // Buffer cleared after flush
    expect(coalescer.getPendingCount()).toBe(0);
    // Efficiency: 15 ingested, 1 batch executed -> 14 saved / 15 = 93.3%
    expect(coalescer.getEfficiencyRatio()).toBeGreaterThan(85);
  });
});
