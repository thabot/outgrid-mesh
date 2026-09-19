/**
 * Unit tests for BlePacketFragmentation (Chunking, Sequence Index, Reassembly)
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, expect, it } from 'bun:test';
import { BlePacketFragmentation } from '../../../src/core/ble/BlePacketFragmentation';

describe('BlePacketFragmentation (Out-of-Order Chunking & Reassembly)', () => {
  it('should split large payload into chunks and reassemble correctly in sequential order', () => {
    const rawData = new Uint8Array(500);
    for (let i = 0; i < rawData.length; i++) {
      rawData[i] = i % 256;
    }

    const chunks = BlePacketFragmentation.splitIntoChunks(12345n, rawData, 150);
    expect(chunks.length).toBe(4); // 150 + 150 + 150 + 50 = 500B

    const reconstructed = BlePacketFragmentation.reassembleChunks(chunks);
    expect(reconstructed).not.toBeNull();
    expect(reconstructed?.length).toBe(500);
    expect(Array.from(reconstructed || [])).toEqual(Array.from(rawData));
  });

  it('should successfully reassemble even when chunks arrive completely out of order', () => {
    const message = 'CRITICAL: Dam overflow at kilometer 24! Immediate evacuation ordered!';
    const rawData = new TextEncoder().encode(message);

    const chunks = BlePacketFragmentation.splitIntoChunks(9999n, rawData, 20);
    expect(chunks.length).toBeGreaterThan(1);

    // Shuffle chunks out-of-order
    const shuffled = [chunks[2], chunks[0], chunks[3], chunks[1]].filter(Boolean);

    const reconstructed = BlePacketFragmentation.reassembleChunks(shuffled);
    expect(reconstructed).not.toBeNull();
    expect(new TextDecoder().decode(reconstructed || undefined)).toBe(message);
  });

  it('should return null if any chunk is still missing', () => {
    const rawData = new Uint8Array(300);
    const chunks = BlePacketFragmentation.splitIntoChunks(777n, rawData, 100); // 3 chunks

    // Only provide chunk 0 and chunk 2 (chunk 1 missing)
    const incomplete = [chunks[0], chunks[2]];
    const reconstructed = BlePacketFragmentation.reassembleChunks(incomplete);
    expect(reconstructed).toBeNull();
  });
});
