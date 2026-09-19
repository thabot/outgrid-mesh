/**
 * Unit tests for TileProxyClient (Edge cache hit, ODbL attribution compliance)
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, expect, it } from 'bun:test';
import { TileProxyClient, ODBL_ATTRIBUTION } from '../../../src/core/spatial/TileProxyClient';
import { OfflineSpatialCache } from '../../../src/core/spatial/OfflineSpatialCache';

describe('TileProxyClient (Edge Caching & ODbL Attribution Compliance)', () => {
  it('should return cached tile from local storage and report fromCache: true', async () => {
    const cache = new OfflineSpatialCache();
    const client = new TileProxyClient('https://tiles.outgrid.org', cache);

    // Pre-populate cache
    cache.put('tile_7_102_55', new Uint8Array([0xde, 0xad, 0xbe, 0xef]));

    const res = await client.getTile(7, 102, 55);
    expect(res.fromCache).toBe(true);
    expect(Array.from(res.data)).toEqual([0xde, 0xad, 0xbe, 0xef]);
  });

  it('should strictly comply with OpenStreetMap ODbL attribution requirement', () => {
    const cache = new OfflineSpatialCache();
    const client = new TileProxyClient('https://tiles.outgrid.org', cache);

    const attribution = client.getAttribution();
    expect(attribution).toContain('OpenStreetMap contributors');
    expect(attribution).toContain('ODbL');
    expect(attribution).toBe(ODBL_ATTRIBUTION);
  });
});
