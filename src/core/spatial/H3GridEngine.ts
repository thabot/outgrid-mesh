/**
 * Spatial H3 Grid & Geo-Hashing Engine (4-Tier Spatial Architecture)
 * Protocol: TOG v1.1 Master Project Plan v6.1 Phase 5 Task 5.1
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { latLngToCell, cellToLatLng, cellToParent, gridDisk, getResolution } from 'h3-js';

export interface IH3Coordinate {
  lat: number;
  lng: number;
}

export interface IH3HierarchyBundle {
  res9: bigint; // ~100m (Core radio mesh base)
  res7: bigint; // ~1.2km (Neighborhood / Anonymous heatmap)
  res5: bigint; // ~8.5km (District emergency broadcast)
  res4: bigint; // ~22km (Inter-district / Data Mule transport)
}

export enum H3Direction {
  SAME_CELL = 0,
  NORTH = 1,
  NORTH_EAST = 2,
  SOUTH_EAST = 3,
  SOUTH = 4,
  SOUTH_WEST = 5,
  NORTH_WEST = 6
}

export class H3GridEngine {
  /**
   * Converts raw GPS coordinates (lat, lng) to H3 Index at specified resolution
   */
  public static coordToH3(lat: number, lng: number, resolution: number = 9): bigint {
    const hexStr = latLngToCell(lat, lng, resolution);
    return BigInt('0x' + hexStr);
  }

  /**
   * Converts H3 Index bigint back to GPS center coordinates (lat, lng)
   */
  public static h3ToCoord(h3Index: bigint): IH3Coordinate {
    const hexStr = h3Index.toString(16);
    const [lat, lng] = cellToLatLng(hexStr);
    return { lat, lng };
  }

  /**
   * Retrieves all 4 hierarchical levels (Res 9, 7, 5, 4) from a base Res 9 cell
   */
  public static get4TierBundle(h3IndexRes9: bigint): IH3HierarchyBundle {
    const hexStr = h3IndexRes9.toString(16);
    const res7Str = cellToParent(hexStr, 7);
    const res5Str = cellToParent(hexStr, 5);
    const res4Str = cellToParent(hexStr, 4);

    return {
      res9: h3IndexRes9,
      res7: BigInt('0x' + res7Str),
      res5: BigInt('0x' + res5Str),
      res4: BigInt('0x' + res4Str)
    };
  }

  /**
   * Gets resolution of an H3 Index
   */
  public static getResolution(h3Index: bigint): number {
    return getResolution(h3Index.toString(16));
  }

  /**
   * Calculates azimuth bearing in degrees (0.0 to 359.99) between two coordinates
   */
  public static calculateBearingDegrees(origin: IH3Coordinate, target: IH3Coordinate): number {
    const lat1 = (origin.lat * Math.PI) / 180;
    const lat2 = (target.lat * Math.PI) / 180;
    const dLng = ((target.lng - origin.lng) * Math.PI) / 180;

    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    const bearing = (Math.atan2(y, x) * 180) / Math.PI;
    return (bearing + 360) % 360;
  }

  /**
   * Determines the 6-sector H3 directional bucket or SAME_CELL
   */
  public static calculateH3Direction(
    origin: IH3Coordinate,
    target: IH3Coordinate,
    originH3?: bigint,
    targetH3?: bigint
  ): H3Direction {
    if (
      (originH3 && targetH3 && originH3 === targetH3) ||
      (Math.abs(origin.lat - target.lat) < 0.0001 && Math.abs(origin.lng - target.lng) < 0.0001)
    ) {
      return H3Direction.SAME_CELL;
    }

    const bearing = this.calculateBearingDegrees(origin, target);

    if (bearing >= 330 || bearing < 30) return H3Direction.NORTH;
    if (bearing >= 30 && bearing < 90) return H3Direction.NORTH_EAST;
    if (bearing >= 90 && bearing < 150) return H3Direction.SOUTH_EAST;
    if (bearing >= 150 && bearing < 210) return H3Direction.SOUTH;
    if (bearing >= 210 && bearing < 270) return H3Direction.SOUTH_WEST;
    return H3Direction.NORTH_WEST; // 270 <= bearing < 330
  }
}

