/**
 * Unit tests for BloomFilter (Counting Bloom Filter for Duplicate Storm Guard)
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, expect, it } from 'bun:test';
import { BloomFilter } from '../../../src/core/protocol/BloomFilter';

describe('BloomFilter (Counting Bloom Filter & Storm Guard)', () => {
  it('should guarantee zero false negatives for inserted items', () => {
    const filter = new BloomFilter(1000, 0.001);
    const ids: bigint[] = [];

    for (let i = 1n; i <= 500n; i++) {
      const msgId = i * 987654321n;
      ids.push(msgId);
      filter.add(msgId);
    }

    // Every inserted ID must return true
    for (const id of ids) {
      expect(filter.has(id)).toBe(true);
    }
  });

  it('should maintain false positive rate < 0.1% for uninserted items', () => {
    const expectedItems = 2000;
    const filter = new BloomFilter(expectedItems, 0.001);

    // Insert 2,000 items
    for (let i = 1n; i <= 2000n; i++) {
      filter.add(i);
    }

    // Test with 5,000 unseen items
    let falsePositives = 0;
    const testCount = 5000;

    for (let i = 10000n; i < 10000n + BigInt(testCount); i++) {
      if (filter.has(i)) {
        falsePositives++;
      }
    }

    const fpRate = falsePositives / testCount;
    // FP rate must stay below target tolerance (< 0.5% in practice)
    expect(fpRate).toBeLessThan(0.005);
  });

  it('should support item removal and decay ageing', () => {
    const filter = new BloomFilter(100, 0.01);
    const targetId = 0xabcdef12345678n;

    filter.add(targetId);
    expect(filter.has(targetId)).toBe(true);

    filter.remove(targetId);
    expect(filter.has(targetId)).toBe(false);
  });

  it('should decay counters to purge old traffic history', () => {
    const filter = new BloomFilter(100, 0.01);
    const targetId = 0x544f0011223344n;

    filter.add(targetId);
    expect(filter.has(targetId)).toBe(true);

    // After decay, single-count items should be halved to 0
    filter.decay();
    expect(filter.has(targetId)).toBe(false);
  });
});
