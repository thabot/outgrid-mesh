/**
 * Unit tests for VectorTileParser (World Basemap <5MB parser)
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, expect, it } from 'bun:test';
import { VectorTileParser, type IMapFeature } from '../../../src/core/spatial/VectorTileParser';

describe('VectorTileParser (Vector Basemap Parser & World Landmass)', () => {
  it('should serialize and parse vector map features with high compactness', () => {
    const sampleFeatures: IMapFeature[] = [
      {
        id: 1,
        type: 'coastline',
        coordinates: [
          [100.5, 13.75],
          [100.52, 13.78],
          [100.55, 13.8]
        ]
      },
      {
        id: 2,
        type: 'city',
        coordinates: [[100.5018, 13.7563]]
      }
    ];

    const binaryBasemap = VectorTileParser.serializeBasemap(sampleFeatures);
    expect(binaryBasemap.length).toBeLessThan(100); // Extremely compact binary format

    const parsed = VectorTileParser.parseBasemap(binaryBasemap);
    expect(parsed.header.magic).toBe('OGMB');
    expect(parsed.header.featureCount).toBe(2);
    expect(parsed.features.length).toBe(2);
    expect(parsed.features[0].type).toBe('coastline');
    expect(parsed.features[0].coordinates.length).toBe(3);
  });

  it('should throw error on invalid map magic', () => {
    const invalidBuf = new Uint8Array(30);
    invalidBuf[0] = 0x58; // 'X'
    expect(() => VectorTileParser.parseBasemap(invalidBuf)).toThrow('Invalid map magic');
  });
});
