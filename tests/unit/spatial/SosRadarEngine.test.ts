/**
 * Unit tests for SosRadarEngine (Compass bearing, distance in meters, live ping)
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, expect, it } from 'bun:test';
import { SosRadarEngine } from '../../../src/core/spatial/SosRadarEngine';
import { H3DeltaCompressor } from '../../../src/core/spatial/H3DeltaCompressor';

describe('SosRadarEngine (Compass Bearing & Radar Navigation)', () => {
  it('should accurately calculate cardinal compass bearings (North, East, South, West)', () => {
    const origin = { lat: 13.0, lng: 100.0 };

    // Point due North
    const north = { lat: 14.0, lng: 100.0 };
    expect(Math.round(SosRadarEngine.calculateBearing(origin, north))).toBe(0);

    // Point due East
    const east = { lat: 13.0, lng: 101.0 };
    expect(Math.round(SosRadarEngine.calculateBearing(origin, east))).toBe(90);

    // Point due South
    const south = { lat: 12.0, lng: 100.0 };
    expect(Math.round(SosRadarEngine.calculateBearing(origin, south))).toBe(180);

    // Point due West
    const west = { lat: 13.0, lng: 99.0 };
    expect(Math.round(SosRadarEngine.calculateBearing(origin, west))).toBe(270);
  });

  it('should compute radar target metrics with relative heading for rescuer navigation', () => {
    const rescuerPos = { lat: 13.7500, lng: 100.4900 };
    const phoneHeading = 45; // Rescuer facing Northeast (45°)

    // Victim is located at slightly further North-East
    const victimPos = { lat: 13.7550, lng: 100.4950 };
    const compressed = H3DeltaCompressor.compress(victimPos.lat, victimPos.lng);

    const radar = SosRadarEngine.computeTarget(
      'victim-1',
      rescuerPos,
      phoneHeading,
      compressed.h3Index,
      compressed.deltaOffset,
      true
    );

    expect(radar.distanceMeters).toBeGreaterThan(600);
    expect(radar.distanceMeters).toBeLessThan(1000);
    expect(radar.isCritical).toBe(true);
    expect(Math.abs(radar.relativeHeadingDeg)).toBeLessThan(90); // Ahead of rescuer
  });

  it('should apply Exponential Moving Average Low-Pass Filter to eliminate compass jitter', () => {
    const smoothedInitial = 90.0; // East
    const noisyJump = 120.0;      // Jump +30° due to magnetic interference

    // After filter (alpha = 0.15), the result should gently step towards 120° (90 + 0.15 * 30 = 94.5°)
    const filtered = SosRadarEngine.applyCompassLowPassFilter(smoothedInitial, noisyJump, 0.15);
    expect(filtered).toBeCloseTo(94.5, 1);

    // Handle 360/0 degree wrap-around (e.g. from 358° to 4°)
    const wrapFiltered = SosRadarEngine.applyCompassLowPassFilter(358.0, 4.0, 0.5);
    expect(wrapFiltered).toBeCloseTo(1.0, 1);
  });

  it('should estimate relative floor level from barometric altitude difference', () => {
    const ground = SosRadarEngine.estimateFloorLevel(0.2);
    expect(ground.floorDifference).toBe(0);
    expect(ground.description.includes('เท่ากัน')).toBe(true);

    const floor3 = SosRadarEngine.estimateFloorLevel(9.0);
    expect(floor3.floorDifference).toBe(3);
    expect(floor3.description.includes('+9 ม.')).toBe(true);
    expect(floor3.description.includes('ชั้น')).toBe(true);

    const basement = SosRadarEngine.estimateFloorLevel(-6.0);
    expect(basement.floorDifference).toBe(-2);
    expect(basement.description.includes('ต่ำกว่าคุณ')).toBe(true);
  });
});

