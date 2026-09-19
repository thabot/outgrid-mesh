export { BloomFilter } from '../protocol/BloomFilter';

/**
 * LRU Message Cache (5,000 entries)
 * Protocol: TOG v1.1 Master Project Plan v6.1 Phase 4 Task 4.3
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */
export class LruMessageCache {
  private capacity: number;
  private cache: Map<string, number> = new Map();

  constructor(capacity: number = 5000) {
    this.capacity = capacity;
  }

  public has(messageId: string | bigint): boolean {
    const key = messageId.toString();
    return this.cache.has(key);
  }

  public add(messageId: string | bigint): void {
    const key = messageId.toString();
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, Date.now());
  }

  public size(): number {
    return this.cache.size;
  }

  public clear(): void {
    this.cache.clear();
  }
}
