/**
 * Unit Test Suite for H3GridEngine Spatial Bearing & Direction Calculation
 * Protocol: TOG v1.1 Wire Specification & Spatial Mesh
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */
import { describe, it, expect } from 'vitest';
import { H3GridEngine, H3Direction } from '../../../src/core/spatial/H3GridEngine';

describe('H3GridEngine Spatial Direction & Azimuth Suite', () => {
  const origin = { lat: 13.7563, lng: 100.5018 }; // Bangkok Center

  describe('Bearing Normalization (0.0 to 359.99 degrees)', () => {
    it('should calculate North azimuth as ~0 degrees', () => {
      const targetNorth = { lat: 13.7663, lng: 100.5018 };
      const bearing = H3GridEngine.calculateBearingDegrees(origin, targetNorth);
      expect(bearing).toBeCloseTo(0.0, 1);
    });

    it('should calculate East azimuth as ~90 degrees', () => {
      const targetEast = { lat: 13.7563, lng: 100.5118 };
      const bearing = H3GridEngine.calculateBearingDegrees(origin, targetEast);
      expect(bearing).toBeCloseTo(90.0, 1);
    });

    it('should calculate South azimuth as ~180 degrees', () => {
      const targetSouth = { lat: 13.7463, lng: 100.5018 };
      const bearing = H3GridEngine.calculateBearingDegrees(origin, targetSouth);
      expect(bearing).toBeCloseTo(180.0, 1);
    });

    it('should calculate West azimuth as ~270 degrees', () => {
      const targetWest = { lat: 13.7563, lng: 100.4918 };
      const bearing = H3GridEngine.calculateBearingDegrees(origin, targetWest);
      expect(bearing).toBeCloseTo(270.0, 1);
    });
  });

  describe('6-Direction H3 Sector Boundaries', () => {
    it('should resolve NORTH for bearings around 0 and 345 deg', () => {
      const dirNorth = H3GridEngine.calculateH3Direction(origin, { lat: 13.7800, lng: 100.5018 });
      expect(dirNorth).toBe(H3Direction.NORTH);
    });

    it('should resolve NORTH_EAST for bearings around 45 deg', () => {
      const dirNE = H3GridEngine.calculateH3Direction(origin, { lat: 13.7700, lng: 100.5200 });
      expect(dirNE).toBe(H3Direction.NORTH_EAST);
    });

    it('should resolve SOUTH_EAST for bearings around 135 deg', () => {
      const dirSE = H3GridEngine.calculateH3Direction(origin, { lat: 13.7400, lng: 100.5200 });
      expect(dirSE).toBe(H3Direction.SOUTH_EAST);
    });

    it('should resolve SOUTH for bearings around 180 deg', () => {
      const dirS = H3GridEngine.calculateH3Direction(origin, { lat: 13.7300, lng: 100.5018 });
      expect(dirS).toBe(H3Direction.SOUTH);
    });

    it('should resolve SOUTH_WEST for bearings around 225 deg', () => {
      const dirSW = H3GridEngine.calculateH3Direction(origin, { lat: 13.7400, lng: 100.4800 });
      expect(dirSW).toBe(H3Direction.SOUTH_WEST);
    });

    it('should resolve NORTH_WEST for bearings around 315 deg', () => {
      const dirNW = H3GridEngine.calculateH3Direction(origin, { lat: 13.7700, lng: 100.4800 });
      expect(dirNW).toBe(H3Direction.NORTH_WEST);
    });
  });

  describe('Same-Cell Detection Edge Cases', () => {
    it('should return SAME_CELL when coordinates are identical', () => {
      const dir = H3GridEngine.calculateH3Direction(origin, { lat: origin.lat, lng: origin.lng });
      expect(dir).toBe(H3Direction.SAME_CELL);
    });

    it('should return SAME_CELL when BigInt H3 indexes match', () => {
      const h3Index = BigInt('0x8965646b14ffffff');
      const dir = H3GridEngine.calculateH3Direction(
        origin,
        { lat: 13.7570, lng: 100.5020 },
        h3Index,
        h3Index
      );
      expect(dir).toBe(H3Direction.SAME_CELL);
    });
  });
});
