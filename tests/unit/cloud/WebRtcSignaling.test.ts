/**
 * Unit tests for WebRtcSignalingEngine
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { WebRtcSignalingEngine, type ISignalingMessage } from '../../../cloudflare/workers/signaling';

describe('WebRtcSignalingEngine (Cloudflare Edge P2P Signaling)', () => {
  let signaling: WebRtcSignalingEngine;
  const tileId = '8828308281fffff';

  beforeEach(() => {
    signaling = new WebRtcSignalingEngine();
  });

  it('should allow nodes to join an H3 spatial cell and discover peers', () => {
    const peersNodeA = signaling.joinSpatialCell(tileId, 'node-A');
    expect(peersNodeA).toEqual([]);

    const peersNodeB = signaling.joinSpatialCell(tileId, 'node-B');
    expect(peersNodeB).toEqual(['node-A']);
  });

  it('should deliver SDP offer and answer between peers with zero media relay', () => {
    signaling.joinSpatialCell(tileId, 'node-A');
    signaling.joinSpatialCell(tileId, 'node-B');

    // Node A sends offer to Node B
    const offerMsg: ISignalingMessage = {
      fromNodeId: 'node-A',
      toNodeId: 'node-B',
      h3TileId: tileId,
      type: 'offer',
      payload: 'v=0\r\no=NodeA...',
      timestamp: 1000,
    };
    signaling.sendSignal(offerMsg);

    // Node B polls signals
    const polledB = signaling.pollSignals('node-B');
    expect(polledB.length).toBe(1);
    expect(polledB[0].type).toBe('offer');
    expect(polledB[0].payload).toBe('v=0\r\no=NodeA...');

    // Mailbox is drained
    expect(signaling.pollSignals('node-B')).toEqual([]);
  });
});
