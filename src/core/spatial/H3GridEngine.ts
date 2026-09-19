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
}
