import { describe, it, expect } from 'bun:test';
import { SosRadarEngine } from '../../../src/core/spatial/SosRadarEngine';

describe('SosRadarEngine (Sprint E Task E.4 Spatial Calculations & Filter)', () => {
  it('should accurately calculate Haversine distance between Bangkok and Chiang Mai (~580km)', () => {
    // Bangkok (13.7563, 100.5018) -> Chiang Mai (18.7883, 98.9853)
    const dist = SosRadarEngine.calculateDistanceMeters(13.7563, 100.5018, 18.7883, 98.9853);
    // Expected distance is ~583,000 meters
    expect(dist).toBeGreaterThan(570000);
    expect(dist).toBeLessThan(600000);
  });

  it('should accurately calculate short-range proximity distance (< 500m)', () => {
    const lat1 = 13.75000;
    const lon1 = 100.50000;
    // ~111m north
    const lat2 = 13.75100;
    const lon2 = 100.50000;

    const dist = SosRadarEngine.calculateDistanceMeters(lat1, lon1, lat2, lon2);
    expect(dist).toBeGreaterThan(105);
    expect(dist).toBeLessThan(115);
  });

  it('should calculate correct forward bearing for cardinal directions', () => {
    // North: lat increases, lon constant
    const bearingNorth = SosRadarEngine.calculateBearingDegrees(13.0, 100.0, 14.0, 100.0);
    expect(Math.round(bearingNorth)).toBe(0);

    // East: lat constant, lon increases
    const bearingEast = SosRadarEngine.calculateBearingDegrees(13.0, 100.0, 13.0, 101.0);
    expect(Math.round(bearingEast)).toBe(90);
  });

  it('should normalize relative bearing correctly (-180 to +180)', () => {
    // Target is due East (90 deg), Device facing North (0 deg) -> +90 deg (Turn right)
    expect(SosRadarEngine.calculateRelativeBearing(0, 90)).toBe(90);

    // Target is due West (270 deg), Device facing North (0 deg) -> -90 deg (Turn left)
    expect(SosRadarEngine.calculateRelativeBearing(0, 270)).toBe(-90);

    // Target is behind (180 deg), Device facing North (0 deg) -> 180 deg
    expect(Math.abs(SosRadarEngine.calculateRelativeBearing(0, 180))).toBe(180);
  });

  it('should smooth compass jitter using Low-Pass Filter across 0/360 boundary', () => {
    const prevHeading = 358;
    const newReading = 2; // Crosses 360 boundary (+4 degrees delta)

    const filtered = SosRadarEngine.applyLowPassFilter(newReading, prevHeading, 0.5);
    // Delta = +4, with alpha=0.5 -> 358 + 2 = 360 = 0 deg
    expect(filtered).toBe(0);
  });

  it('should accurately estimate building floor level based on barometric pressure', () => {
    // Sea level baseline: 1013.25 hPa -> Floor 1, ~0m
    const ground = SosRadarEngine.estimateFloorLevel(1013.25, 1013.25);
    expect(ground.estimatedFloor).toBe(1);
    expect(Math.abs(ground.altitudeMeters)).toBeLessThan(1);

    // 4th floor (~9m higher, pressure drops ~1.1 hPa)
    const fourthFloor = SosRadarEngine.estimateFloorLevel(1012.15, 1013.25);
    expect(fourthFloor.estimatedFloor).toBe(4);
    expect(fourthFloor.altitudeMeters).toBeGreaterThan(8);
  });
});
