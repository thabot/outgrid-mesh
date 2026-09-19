import { describe, test, expect } from 'bun:test';
import { SlidingWindow } from '../../../src/core/protocol/SlidingWindow';

describe('SlidingWindow & Selective NACK (Phase 2 Task 2.6.6)', () => {
  test('should serialize and deserialize empty missing list NACK packet', () => {
    const msgId = 9876543210n;
    const missing: number[] = [];

    const wire = SlidingWindow.serializeNack(msgId, missing);
    expect(wire.length).toBe(10); // 8B msgId + 2B count (0)

    const parsed = SlidingWindow.deserializeNack(wire);
    expect(parsed.messageId).toBe(msgId);
    expect(parsed.missingCount).toBe(0);
    expect(parsed.missingIndices).toEqual([]);
  });

  test('should accurately serialize and deserialize multiple missing chunk indices', () => {
    const msgId = 1234567890123456789n;
    const missing = [1, 5, 8, 14, 25, 99];

    const wire = SlidingWindow.serializeNack(msgId, missing);
    expect(wire.length).toBe(10 + missing.length * 2);

    const parsed = SlidingWindow.deserializeNack(wire);
    expect(parsed.messageId).toBe(msgId);
    expect(parsed.missingCount).toBe(6);
    expect(parsed.missingIndices).toEqual([1, 5, 8, 14, 25, 99]);
  });

  test('should throw error when deserializing buffer smaller than 10 bytes', () => {
    const invalidBuf = new Uint8Array(8);
    expect(() => SlidingWindow.deserializeNack(invalidBuf)).toThrow();
  });

  test('should compute backoff delay with jitter within expected boundaries', () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      const delay = SlidingWindow.computeBackoffJitterMs(attempt, 50, 150);
      expect(delay).toBeGreaterThanOrEqual(50);
      expect(delay).toBeLessThanOrEqual(1000 + 150);
    }
  });
});
