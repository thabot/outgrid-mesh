import { describe, expect, it, beforeEach } from 'bun:test';
import {
  BlePacketFragmentation,
  EXTENDED_BLE_CHUNK_PAYLOAD,
  LEGACY_BLE_CHUNK_PAYLOAD,
  CHUNK_HEADER_SIZE
} from '../../../src/core/ble/BlePacketFragmentation';

describe('Phase 2 - Task 2.1: BlePacketFragmentation Dual Mode & 8B Header Guard', () => {
  beforeEach(() => {
    BlePacketFragmentation.clearStore();
  });

  it('should split payload into dual mode chunks correctly', () => {
    const payload = new Uint8Array(500);
    for (let i = 0; i < 500; i++) payload[i] = i % 256;

    const messageId = 0x12345678AABBCCDDn;
    const { extendedChunks, legacyChunks } = BlePacketFragmentation.createDualModeChunks(messageId, payload);

    // 500 / 180 = 3 chunks (180, 180, 140)
    expect(extendedChunks.length).toBe(3);
    expect(extendedChunks[0].length).toBe(180 + CHUNK_HEADER_SIZE);
    expect(extendedChunks[2].length).toBe(140 + CHUNK_HEADER_SIZE);

    // 500 / 24 = 21 chunks
    expect(legacyChunks.length).toBe(Math.ceil(500 / 24));
  });

  it('should reassemble out-of-order chunks statefully with collision isolation', () => {
    const payload = new TextEncoder().encode('OutGrid Mesh emergency communication payload packet');
    const msgId1 = 1001n;
    const msgId2 = 2002n;

    const chunksMsg1 = BlePacketFragmentation.splitIntoChunks(msgId1, payload, 10);
    const chunksMsg2 = BlePacketFragmentation.splitIntoChunks(msgId2, payload, 10);

    // Interleave ingestion from two different message IDs:
    // Msg1 chunk 1, Msg2 chunk 0, Msg1 chunk 0, Msg1 remaining
    let res = BlePacketFragmentation.ingestChunk(chunksMsg1[1]);
    expect(res).toBeNull();

    res = BlePacketFragmentation.ingestChunk(chunksMsg2[0]);
    expect(res).toBeNull(); // Msg2 chunk 0 received, does not complete msg1

    res = BlePacketFragmentation.ingestChunk(chunksMsg1[0]);
    expect(res).toBeNull();

    // Ingest rest of Msg1
    for (let i = 2; i < chunksMsg1.length; i++) {
      res = BlePacketFragmentation.ingestChunk(chunksMsg1[i]);
    }

    expect(res).not.toBeNull();
    expect(new TextDecoder().decode(res!)).toBe('OutGrid Mesh emergency communication payload packet');
  });

  it('should evict incomplete buffers after timeout', () => {
    const payload = new Uint8Array(200);
    const chunks = BlePacketFragmentation.splitIntoChunks(999n, payload, 50);

    // Ingest first chunk at t = 1000
    BlePacketFragmentation.ingestChunk(chunks[0], 1000);

    // At t = 20000 (20s later), not expired yet
    const evictedEarly = BlePacketFragmentation.evictExpiredBuffers(20000);
    expect(evictedEarly).toBe(0);

    // At t = 32000 (31s later), expired
    const evictedLate = BlePacketFragmentation.evictExpiredBuffers(32000);
    expect(evictedLate).toBe(1);
  });
});
