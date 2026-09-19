/**
 * Unit tests for OfflineSpatialCache (Map tile cache & FIFO eviction)
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, expect, it } from 'bun:test';
import { OfflineSpatialCache } from '../../../src/core/spatial/OfflineSpatialCache';

describe('OfflineSpatialCache (IndexedDB / SQLite Spatial Caching)', () => {
  it('should store and retrieve vector tiles', () => {
    const cache = new OfflineSpatialCache(1000);
    const tileData = new Uint8Array([1, 2, 3, 4, 5]);

    cache.put('tile_1', tileData);
    const retrieved = cache.get('tile_1');

    expect(retrieved).toBeDefined();
    expect(Array.from(retrieved || [])).toEqual([1, 2, 3, 4, 5]);
  });

  it('should evict least recently used tiles when cache capacity is exceeded', () => {
    const cache = new OfflineSpatialCache(200);

    cache.put('t1', new Uint8Array(100));
    cache.put('t2', new Uint8Array(100));

    // Access t1 so t2 becomes older
    cache.get('t1');

    // Put t3 (100B) -> Exceeds 200B limit, must evict t2
    cache.put('t3', new Uint8Array(100));

    expect(cache.get('t1')).toBeDefined();
    expect(cache.get('t3')).toBeDefined();
    expect(cache.get('t2')).toBeUndefined(); // Evicted!
  });
});
