/**
 * Counting Bloom Filter & Duplicate Storm Guard
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export class BloomFilter {
  private size: number;
  private hashCount: number;
  private counters: Uint8Array; // 4-bit / 8-bit counters for items
  private maxCount: number;

  /**
   * Initializes a Counting Bloom Filter
   * @param expectedItems Number of items before decay (default 10,000)
   * @param falsePositiveRate Target collision rate (default 0.001 = 0.1%)
   */
  constructor(expectedItems = 10000, falsePositiveRate = 0.001) {
    // Optimal size m = - (n * ln(p)) / (ln(2)^2)
    const m = Math.ceil(- (expectedItems * Math.log(falsePositiveRate)) / (Math.LN2 * Math.LN2));
    this.size = Math.max(1024, m);

    // Optimal k = (m / n) * ln(2)
    const k = Math.round((this.size / expectedItems) * Math.LN2);
    this.hashCount = Math.max(2, Math.min(8, k));

    this.counters = new Uint8Array(this.size);
    this.maxCount = 255;
  }

  /**
   * Generates k hash indexes for a 64-bit BigInt or Uint8Array using double hashing
   */
  private getIndexes(item: bigint | Uint8Array): number[] {
    let h1: number;
    let h2: number;

    if (typeof item === 'bigint') {
      // 64-bit splitmix style hash
      let z = (item ^ 0x9e3779b97f4a7c15n) & 0xffffffffffffffffn;
      z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & 0xffffffffffffffffn;
      z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & 0xffffffffffffffffn;
      const mixed = z ^ (z >> 31n);
      h1 = Number(mixed & 0xffffffffn) >>> 0;
      h2 = Number((mixed >> 32n) & 0xffffffffn) >>> 0;
      if (h2 === 0) h2 = 1;
    } else {
      let hash = 0x811c9dc5;
      for (let i = 0; i < item.length; i++) {
        hash ^= item[i];
        hash = Math.imul(hash, 0x01000193);
      }
      h1 = hash >>> 0;
      h2 = ((hash ^ (hash >>> 16)) * 0x45d9f3b) >>> 0;
      if (h2 === 0) h2 = 1;
    }

    const indexes: number[] = [];
    for (let i = 0; i < this.hashCount; i++) {
      const idx = (h1 + Math.imul(i, h2)) >>> 0;
      indexes.push(idx % this.size);
    }
    return indexes;
  }

  /**
   * Inserts an item into the Counting Bloom Filter
   */
  public add(item: bigint | Uint8Array): void {
    const indexes = this.getIndexes(item);
    for (const idx of indexes) {
      if (this.counters[idx] < this.maxCount) {
        this.counters[idx]++;
      }
    }
  }

  /**
   * Checks if an item may already exist in the filter
   * Returns true if probably present, false if definitely not present (Zero False Negatives)
   */
  public has(item: bigint | Uint8Array): boolean {
    const indexes = this.getIndexes(item);
    for (const idx of indexes) {
      if (this.counters[idx] === 0) {
        return false;
      }
    }
    return true;
  }

  /**
   * Decrements counters to remove an expired item
   */
  public remove(item: bigint | Uint8Array): void {
    if (!this.has(item)) return;
    const indexes = this.getIndexes(item);
    for (const idx of indexes) {
      if (this.counters[idx] > 0) {
        this.counters[idx]--;
      }
    }
  }

  /**
   * Halves all counters (Ageing / Decay mechanism to purge old history without reallocation)
   */
  public decay(): void {
    for (let i = 0; i < this.size; i++) {
      this.counters[i] = this.counters[i] >> 1;
    }
  }

  /**
   * Resets all filter counters
   */
  public clear(): void {
    this.counters.fill(0);
  }

  public getSize(): number {
    return this.size;
  }

  public getHashCount(): number {
    return this.hashCount;
  }
}
