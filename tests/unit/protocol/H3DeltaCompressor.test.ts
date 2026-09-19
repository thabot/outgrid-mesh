/**
 * Unit tests for H3DeltaCompressor (< 1m GPS Precision)
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, expect, it } from 'bun:test';
import { H3DeltaCompressor } from '../../../src/core/spatial/H3DeltaCompressor';

describe('H3DeltaCompressor (< 1m GPS Precision)', () => {
  it('should compress and decompress GPS coordinates with < 1 meter error (Bangkok)', () => {
    // Bangkok Grand Palace coords
    const originLat = 13.750058;
    const originLng = 100.491416;

    const compressed = H3DeltaCompressor.compress(originLat, originLng);
    expect(compressed.h3Index).toBeGreaterThan(0n);
    expect(Math.abs(compressed.deltaOffset.deltaX)).toBeLessThan(500);
    expect(Math.abs(compressed.deltaOffset.deltaY)).toBeLessThan(500);

    const recovered = H3DeltaCompressor.decompress(compressed.h3Index, compressed.deltaOffset);
    const errorDistanceMeters = H3DeltaCompressor.calculateDistanceMeters(
      { lat: originLat, lng: originLng },
      recovered
    );

    // Precision must strictly be < 1.0 meter!
    expect(errorDistanceMeters).toBeLessThan(1.0);
  });

  it('should maintain < 1 meter precision across various global locations', () => {
    const locations = [
      { name: 'Tokyo', lat: 35.6762, lng: 139.6503 },
      { name: 'London', lat: 51.5074, lng: -0.1278 },
      { name: 'Chiang Mai', lat: 18.7883, lng: 98.9853 },
      { name: 'Sydney', lat: -33.8688, lng: 151.2093 }
    ];

    for (const loc of locations) {
      const compressed = H3DeltaCompressor.compress(loc.lat, loc.lng);
      const recovered = H3DeltaCompressor.decompress(compressed.h3Index, compressed.deltaOffset);
      const errorMeters = H3DeltaCompressor.calculateDistanceMeters(
        { lat: loc.lat, lng: loc.lng },
        recovered
      );
      expect(errorMeters).toBeLessThan(1.0);
    }
  });
});
