/**
 * High-Precision H3 Delta Compressor (< 1m GPS Precision)
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { latLngToCell, cellToLatLng } from 'h3-js';
import type { IH3LocalDeltaOffset } from '../protocol/TOGPacket';

export const H3_RESOLUTION = 9; // ~100m hexagon resolution
const EARTH_RADIUS_METERS = 6378137.0;

export interface IGpsCoordinate {
  lat: number;
  lng: number;
}

export interface ICompressedH3Location {
  h3Index: bigint;
  deltaOffset: IH3LocalDeltaOffset;
}

export class H3DeltaCompressor {
  /**
   * Compresses GPS lat/lng into H3 Index (Res 9) + Delta X/Y (int16 4 bytes)
   * Precision: < 1 meter
   */
  public static compress(lat: number, lng: number, resolution = H3_RESOLUTION): ICompressedH3Location {
    const h3String = latLngToCell(lat, lng, resolution);
    const h3Index = BigInt('0x' + h3String);

    // Get center of H3 Cell
    const [centerLat, centerLng] = cellToLatLng(h3String);

    // Calculate displacement in meters (Delta X: East/West, Delta Y: North/South)
    const dLat = ((lat - centerLat) * Math.PI) / 180.0;
    const dLng = ((lng - centerLng) * Math.PI) / 180.0;
    const meanLat = ((lat + centerLat) / 2.0 * Math.PI) / 180.0;

    const deltaY = Math.round(dLat * EARTH_RADIUS_METERS);
    const deltaX = Math.round(dLng * EARTH_RADIUS_METERS * Math.cos(meanLat));

    // Clamp to int16 range (-32768 to 32767) - hexagon Res 9 radius is only ~100m
    const clampedX = Math.max(-1500, Math.min(1500, deltaX));
    const clampedY = Math.max(-1500, Math.min(1500, deltaY));

    return {
      h3Index,
      deltaOffset: {
        deltaX: clampedX,
        deltaY: clampedY
      }
    };
  }

  /**
   * Decompresses H3 Index + Delta X/Y back to GPS lat/lng
   * Accurate to < 1 meter
   */
  public static decompress(h3Index: bigint, deltaOffset: IH3LocalDeltaOffset): IGpsCoordinate {
    const h3String = h3Index.toString(16);
    const [centerLat, centerLng] = cellToLatLng(h3String);

    const meanLatRad = (centerLat * Math.PI) / 180.0;

    // Convert meters back to degrees
    const dLat = (deltaOffset.deltaY / EARTH_RADIUS_METERS) * (180.0 / Math.PI);
    const dLng = (deltaOffset.deltaX / (EARTH_RADIUS_METERS * Math.cos(meanLatRad))) * (180.0 / Math.PI);

    return {
      lat: centerLat + dLat,
      lng: centerLng + dLng
    };
  }

  /**
   * Calculates Haversine distance in meters between two GPS points
   */
  public static calculateDistanceMeters(p1: IGpsCoordinate, p2: IGpsCoordinate): number {
    const dLat = ((p2.lat - p1.lat) * Math.PI) / 180.0;
    const dLng = ((p2.lng - p1.lng) * Math.PI) / 180.0;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((p1.lat * Math.PI) / 180.0) *
      Math.cos((p2.lat * Math.PI) / 180.0) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_METERS * c;
  }
}
