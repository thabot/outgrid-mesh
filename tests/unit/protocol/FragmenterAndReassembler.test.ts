import { describe, test, expect } from 'bun:test';
import { Fragmenter, Reassembler, REASSEMBLY_TIMEOUT_MS } from '../../../src/core/protocol/Fragmenter';

describe('Fragmenter & Reassembler (Phase 2 Task 2.6.5)', () => {
  test('should not fragment payload smaller than MTU chunk size', () => {
    const smallPayload = new Uint8Array([1, 2, 3, 4, 5]);
    const fragments = Fragmenter.slice(1n, smallPayload, 180);
    expect(fragments).toHaveLength(1);
    expect(fragments[0]!.totalChunks).toBe(1);
    expect(fragments[0]!.sequenceIndex).toBe(0);
    expect(fragments[0]!.data).toEqual(smallPayload);
  });

  test('should slice large payload with 4-byte sub-header protocol and wire serialization', () => {
    // 500 bytes payload with chunkSize = 100
    const largePayload = new Uint8Array(500);
    for (let i = 0; i < 500; i++) largePayload[i] = i % 256;

    const fragments = Fragmenter.slice(42n, largePayload, 100);
    expect(fragments).toHaveLength(5);

    fragments.forEach((frag, idx) => {
      expect(frag.messageId).toBe(42n);
      expect(frag.sequenceIndex).toBe(idx);
      expect(frag.totalChunks).toBe(5);
      expect(frag.data.length).toBe(100);

      // Verify wire serialization and deserialization
      const wire = Fragmenter.serializeFragment(frag);
      expect(wire.length).toBe(12 + 100); // 8B msgId + 2B total + 2B seq + 100B data
      
      const parsed = Fragmenter.deserializeFragment(wire);
      expect(parsed.messageId).toBe(42n);
      expect(parsed.totalChunks).toBe(5);
      expect(parsed.sequenceIndex).toBe(idx);
      expect(parsed.data).toEqual(frag.data);
    });
  });

  test('should reassemble fragments received in order', () => {
    const payload = new Uint8Array(350);
    for (let i = 0; i < 350; i++) payload[i] = (i * 3) % 256;

    const fragments = Fragmenter.slice(101n, payload, 100);
    const reassembler = new Reassembler();

    let result: Uint8Array | null = null;
    for (const frag of fragments) {
      result = reassembler.ingestFragment(frag);
    }

    expect(result).not.toBeNull();
    expect(result!).toEqual(payload);
  });

  test('should reassemble fragments received out of order', () => {
    const payload = new Uint8Array(450);
    for (let i = 0; i < 450; i++) payload[i] = (i * 7) % 256;

    const fragments = Fragmenter.slice(202n, payload, 100);
    // Shuffle fragments: 2, 0, 4, 1, 3
    const shuffled = [fragments[2]!, fragments[0]!, fragments[4]!, fragments[1]!, fragments[3]!];
    
    const reassembler = new Reassembler();
    let result: Uint8Array | null = null;
    for (const frag of shuffled) {
      result = reassembler.ingestFragment(frag);
    }

    expect(result).not.toBeNull();
    expect(result!).toEqual(payload);
  });

  test('should return missing chunk indices when fragments are missing', () => {
    const payload = new Uint8Array(400);
    const fragments = Fragmenter.slice(303n, payload, 100); // 4 fragments (0, 1, 2, 3)
    const reassembler = new Reassembler();

    // Add 0 and 2, missing 1 and 3
    reassembler.ingestFragment(fragments[0]!);
    reassembler.ingestFragment(fragments[2]!);

    const missing = reassembler.getMissingChunkIndices(303n);
    expect(missing).toEqual([1, 3]);
  });

  test('should purge timed-out transfers after 15 minutes', () => {
    const payload = new Uint8Array(200);
    const fragments = Fragmenter.slice(505n, payload, 100);
    const reassembler = new Reassembler();

    reassembler.ingestFragment(fragments[0]!);
    expect(reassembler.getActiveSessionCount()).toBe(1);

    // Evict expired with artificial time passing
    // Modify session's lastUpdated
    const origNow = Date.now;
    try {
      Date.now = () => origNow() + REASSEMBLY_TIMEOUT_MS + 1000;
      const evicted = reassembler.evictExpiredSessions();
      expect(evicted).toBe(1);
      expect(reassembler.getActiveSessionCount()).toBe(0);
    } finally {
      Date.now = origNow;
    }
  });
});

