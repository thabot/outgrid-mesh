/**
 * SOS Radar & Compass Navigation Engine
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { H3DeltaCompressor, type IGpsCoordinate } from './H3DeltaCompressor';
import type { IH3LocalDeltaOffset } from '../protocol/TOGPacket';

export interface IRadarTarget {
  targetId: string;
  distanceMeters: number;
  compassBearingDeg: number; // 0° North, 90° East, 180° South, 270° West
  relativeHeadingDeg: number; // -180° (left) to +180° (right) based on current phone heading
  isCritical: boolean;
}

export class SosRadarEngine {
  /**
   * Calculates compass bearing in degrees (0 to 360) from point A to point B
   */
  public static calculateBearing(from: IGpsCoordinate, to: IGpsCoordinate): number {
    const lat1 = (from.lat * Math.PI) / 180.0;
    const lat2 = (to.lat * Math.PI) / 180.0;
    const dLng = ((to.lng - from.lng) * Math.PI) / 180.0;

    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

    const bearingRad = Math.atan2(y, x);
    const bearingDeg = (bearingRad * 180.0) / Math.PI;

    return (bearingDeg + 360.0) % 360.0;
  }

  /**
   * Computes directional radar target given rescuer position and incoming SOS H3 + Delta Offset
   */
  public static computeTarget(
    targetId: string,
    rescuerPos: IGpsCoordinate,
    rescuerCompassHeading: number,
    sosH3Index: bigint,
    sosDeltaOffset: IH3LocalDeltaOffset,
    isCritical = true
  ): IRadarTarget {
    const targetPos = H3DeltaCompressor.decompress(sosH3Index, sosDeltaOffset);
    const distanceMeters = Math.round(H3DeltaCompressor.calculateDistanceMeters(rescuerPos, targetPos));
    const compassBearingDeg = Math.round(this.calculateBearing(rescuerPos, targetPos));

    // Relative heading relative to phone's current facing direction
    let relativeHeading = compassBearingDeg - rescuerCompassHeading;
    while (relativeHeading > 180) relativeHeading -= 360;
    while (relativeHeading < -180) relativeHeading += 360;

    return {
      targetId,
      distanceMeters,
      compassBearingDeg,
      relativeHeadingDeg: Math.round(relativeHeading),
      isCritical
    };
  }

  /**
   * Applies Exponential Moving Average (Low-Pass Filter) to remove compass jitter
   * @param currentSmoothed Current filtered azimuth angle (0-360)
   * @param newRaw New noisy magnetometer reading (0-360)
   * @param alpha Smoothing factor (default 0.15 for smooth 60fps movement)
   */
  public static applyCompassLowPassFilter(currentSmoothed: number, newRaw: number, alpha = 0.15): number {
    // Handle 360/0 degree circular wrap-around
    let diff = newRaw - currentSmoothed;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;

    const smoothed = currentSmoothed + alpha * diff;
    return (smoothed + 360) % 360;
  }

  /**
   * Estimates building floor level difference using relative barometric pressure
   * Standard lapse rate: ~1 hPa per 8.3 meters (~3 meters per floor level)
   */
  public static estimateFloorLevel(relativeAltitudeMeters: number): {
    floorDifference: number;
    description: string;
  } {
    const floorDifference = Math.round(relativeAltitudeMeters / 3.0);

    if (floorDifference > 0) {
      return {
        floorDifference,
        description: `🔺 อยู่สูงกว่าคุณประมาณ +${Math.round(relativeAltitudeMeters)} ม. (~${floorDifference} ชั้น)`,
      };
    } else if (floorDifference < 0) {
      return {
        floorDifference,
        description: `🔻 อยู่ต่ำกว่าคุณประมาณ ${Math.round(relativeAltitudeMeters)} ม. (~${Math.abs(floorDifference)} ชั้น)`,
      };
    } else {
      return {
        floorDifference: 0,
        description: '🟢 ระดับความสูงเท่ากัน (Same Floor Level)',
      };
    }
  }
}
