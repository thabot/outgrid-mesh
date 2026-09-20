import { describe, it, expect } from 'bun:test';
import fs from 'fs';
import path from 'path';
import { VectorTileParser } from '../../../src/core/spatial/VectorTileParser';

describe('WorldBasemapValidation (Sprint A Task A.4 Basemap Validation Tests)', () => {
  const basemapPath = path.resolve(import.meta.dir, '../../../static/data/world_basemap_l2.json');

  it('should verify world_basemap_l2.json exists and is strictly <= 6 MB', () => {
    expect(fs.existsSync(basemapPath)).toBe(true);

    const stats = fs.statSync(basemapPath);
    const maxAllowedBytes = 6 * 1024 * 1024; // 6 MB ceiling

    expect(stats.size).toBeGreaterThan(100);
    expect(stats.size).toBeLessThanOrEqual(maxAllowedBytes);
  });

  it('should parse valid GeoJSON FeatureCollection structure with metadata', () => {
    const rawContent = fs.readFileSync(basemapPath, 'utf8');
    const geoJson = JSON.parse(rawContent);

    expect(geoJson.type).toBe('FeatureCollection');
    expect(Array.isArray(geoJson.features)).toBe(true);
    expect(geoJson.features.length).toBeGreaterThan(10);
    expect(geoJson.metadata).toBeDefined();
    expect(geoJson.metadata.generator).toContain('OutGrid');
  });

  it('should contain all required multi-layers: country, state, river, and city', () => {
    const rawContent = fs.readFileSync(basemapPath, 'utf8');
    const geoJson = JSON.parse(rawContent);

    const parsed = VectorTileParser.parseWorldBasemapGeoJson(geoJson);

    expect(parsed.valid).toBe(true);
    expect(parsed.layers.country).toBeGreaterThan(0);
    expect(parsed.layers.state).toBeGreaterThan(0);
    expect(parsed.layers.river).toBeGreaterThan(0);
    expect(parsed.layers.city).toBeGreaterThan(0);
  });

  it('should enforce coordinate decimal precision <= 3 places (~110m resolution)', () => {
    const rawContent = fs.readFileSync(basemapPath, 'utf8');
    const geoJson = JSON.parse(rawContent);

    for (const f of geoJson.features) {
      expect(f.geometry).toBeDefined();
      expect(f.geometry.coordinates).toBeDefined();

      const flattenCoords = (c: any): number[] => {
        if (typeof c[0] === 'number') return c;
        return c.flatMap(flattenCoords);
      };

      const coords = flattenCoords(f.geometry.coordinates);
      for (let i = 0; i < coords.length; i += 2) {
        const lng = coords[i];
        const lat = coords[i + 1];

        // Bounds check
        expect(lng).toBeGreaterThanOrEqual(-180);
        expect(lng).toBeLessThanOrEqual(180);
        expect(lat).toBeGreaterThanOrEqual(-90);
        expect(lat).toBeLessThanOrEqual(90);

        // Precision check: multiplying by 1000 and rounding should yield the exact number
        const roundedLng = Math.round(lng * 1000) / 1000;
        const roundedLat = Math.round(lat * 1000) / 1000;
        expect(Math.abs(lng - roundedLng)).toBeLessThan(1e-5);
        expect(Math.abs(lat - roundedLat)).toBeLessThan(1e-5);
      }
    }
  });

  it('should reject malformed or non-FeatureCollection data in VectorTileParser', () => {
    expect(() => {
      VectorTileParser.parseWorldBasemapGeoJson({ type: 'InvalidType' });
    }).toThrow();

    expect(() => {
      VectorTileParser.parseWorldBasemapGeoJson(null);
    }).toThrow();
  });
});
