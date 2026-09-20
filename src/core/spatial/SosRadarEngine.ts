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
  public static readonly EARTH_RADIUS_METERS = 6371000;
  public static readonly DEFAULT_LPF_ALPHA = 0.15; // Low-Pass Filter coefficient

  /**
   * Calculates compass bearing in degrees (0 to 360) from point A to point B
   */
  public static calculateBearing(from: IGpsCoordinate, to: IGpsCoordinate): number {
    return this.calculateBearingDegrees(from.lat, from.lng, to.lat, to.lng);
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
   * Calculates great-circle distance between two geographic coordinates using Haversine formula
   */
  public static calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const phi1 = toRad(lat1);
    const phi2 = toRad(lat2);
    const deltaPhi = toRad(lat2 - lat1);
    const deltaLambda = toRad(lon2 - lon1);

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(SosRadarEngine.EARTH_RADIUS_METERS * c * 10) / 10;
  }

  /**
   * Calculates initial forward bearing (azimuth) from point 1 to point 2 in degrees (0 - 360)
   */
  public static calculateBearingDegrees(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const toDeg = (r: number) => (r * 180) / Math.PI;

    const phi1 = toRad(lat1);
    const phi2 = toRad(lat2);
    const deltaLambda = toRad(lon2 - lon1);

    const y = Math.sin(deltaLambda) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

    const theta = Math.atan2(y, x);
    return (toDeg(theta) + 360) % 360;
  }

  /**
   * Computes relative bearing to target relative to current device compass heading
   * Returns signed degrees (-180 to +180) where 0 = directly ahead, 90 = right, -90 = left
   */
  public static calculateRelativeBearing(deviceHeadingDeg: number, targetBearingDeg: number): number {
    let diff = (targetBearingDeg - deviceHeadingDeg) % 360;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return Math.round(diff * 10) / 10;
  }

  /**
   * Applies Exponential Moving Average (EMA) Low-Pass Filter to smooth angular compass readings
   * Handles 0/360 boundary crossover seamlessly
   */
  public static applyLowPassFilter(
    currentDeg: number,
    previousFilteredDeg: number,
    alpha = SosRadarEngine.DEFAULT_LPF_ALPHA
  ): number {
    let delta = (currentDeg - previousFilteredDeg) % 360;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    const filtered = (previousFilteredDeg + alpha * delta + 360) % 360;
    return Math.round(filtered * 10) / 10;
  }

  /**
   * Estimates relative altitude and floor level from barometric air pressure (hPa)
   * Formula: Hypsometric barometric formula (~8.3 meters per 1 hPa at sea level)
   * Standard building floor height = 3.0 meters
   */
  public static estimateFloorLevel(
    currentPressureHpa: number,
    baselinePressureHpa = 1013.25,
    floorHeightMeters = 3.0
  ): { altitudeMeters: number; estimatedFloor: number } {
    // Barometric formula: h = 44330 * (1 - (P / P0)^(1 / 5.255))
    const altitudeMeters =
      44330 * (1 - Math.pow(currentPressureHpa / baselinePressureHpa, 1 / 5.255));
    const estimatedFloor = Math.max(1, Math.round(altitudeMeters / floorHeightMeters) + 1);

    return {
      altitudeMeters: Math.round(altitudeMeters * 10) / 10,
      estimatedFloor
    };
  }
}
