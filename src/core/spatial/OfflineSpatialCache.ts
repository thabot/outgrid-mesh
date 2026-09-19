/**
 * Offline Spatial Cache & Tile Eviction Manager
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export interface ICachedTile {
  tileKey: string;      // e.g. "z7_x102_y55" or H3 index hex
  data: Uint8Array;
  sizeBytes: number;
  accessCount: number;
}

export class OfflineSpatialCache {
  private cache: Map<string, ICachedTile> = new Map();
  private currentBytes: number = 0;
  private maxBytes: number;
  private counter: number = 0;

  constructor(maxBytes = 25 * 1024 * 1024) { // Default 25MB map tile cache
    this.maxBytes = maxBytes;
  }

  public put(tileKey: string, data: Uint8Array): void {
    const existing = this.cache.get(tileKey);
    if (existing) {
      this.currentBytes -= existing.sizeBytes;
    }

    // Evict least recently accessed tiles if over quota
    this.ensureCapacity(data.length);

    this.counter++;
    this.cache.set(tileKey, {
      tileKey,
      data,
      sizeBytes: data.length,
      accessCount: this.counter
    });
    this.currentBytes += data.length;
  }

  public get(tileKey: string): Uint8Array | undefined {
    const item = this.cache.get(tileKey);
    if (!item) return undefined;
    this.counter++;
    item.accessCount = this.counter;
    return item.data;
  }

  private ensureCapacity(incoming: number): void {
    while (this.currentBytes + incoming > this.maxBytes && this.cache.size > 0) {
      let oldestKey: string | null = null;
      let oldestCounter = Infinity;

      for (const [key, item] of this.cache.entries()) {
        if (item.accessCount < oldestCounter) {
          oldestCounter = item.accessCount;
          oldestKey = key;
        }
      }

      if (oldestKey) {
        const evicted = this.cache.get(oldestKey);
        if (evicted) {
          this.currentBytes -= evicted.sizeBytes;
          this.cache.delete(oldestKey);
        }
      } else {
        break;
      }
    }
  }

  public getCurrentBytes(): number {
    return this.currentBytes;
  }

  public getTileCount(): number {
    return this.cache.size;
  }

  public clear(): void {
    this.cache.clear();
    this.currentBytes = 0;
  }
}
