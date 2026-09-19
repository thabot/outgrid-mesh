/**
 * Progressive Spatial Expansion & K-Ring Search Engine
 * Protocol: TOG v1.1 Master Project Plan v6.1 Phase 5 Task 5.2
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { gridDisk, cellToParent } from 'h3-js';

export enum SpatialExpansionTier {
  TIER_1_RES9 = 1, // Offline < 15 min: Res 9 (~100m) direct BLE
  TIER_2_RES7 = 2, // Offline 15m - 2h: Res 7 (~1.2km) + k=1 (6 surrounding cells)
  TIER_3_RES5 = 3, // Offline 2h - 12h: Res 5 (~8.5km) district shelters
  TIER_4_RES4 = 4  // Offline > 12h: Res 4 (~22km) inter-district Data Mule
}

export interface ISpatialSearchScope {
  tier: SpatialExpansionTier;
  targetCells: bigint[];
  resolution: number;
}

export class SpatialExpansionEngine {
  /**
   * Computes current search scope based on offline duration (ms)
   */
  public static computeScope(h3IndexRes9: bigint, offlineDurationMs: number): ISpatialSearchScope {
    const hexStr = h3IndexRes9.toString(16);

    // Tier 1: < 15 minutes (900,000 ms) -> Direct Res 9
    if (offlineDurationMs < 15 * 60 * 1000) {
      return {
        tier: SpatialExpansionTier.TIER_1_RES9,
        targetCells: [h3IndexRes9],
        resolution: 9
      };
    }

    // Tier 2: 15 min to 2 hours (7,200,000 ms) -> Res 7 + gridDisk(k=1) (7 cells total)
    if (offlineDurationMs < 2 * 60 * 60 * 1000) {
      const res7Str = cellToParent(hexStr, 7);
      const ringCells = gridDisk(res7Str, 1);
      return {
        tier: SpatialExpansionTier.TIER_2_RES7,
        targetCells: ringCells.map(c => BigInt('0x' + c)),
        resolution: 7
      };
    }

    // Tier 3: 2 hours to 12 hours (43,200,000 ms) -> Res 5
    if (offlineDurationMs < 12 * 60 * 60 * 1000) {
      const res5Str = cellToParent(hexStr, 5);
      return {
        tier: SpatialExpansionTier.TIER_3_RES5,
        targetCells: [BigInt('0x' + res5Str)],
        resolution: 5
      };
    }

    // Tier 4: > 12 hours -> Res 4 Data Mule
    const res4Str = cellToParent(hexStr, 4);
    return {
      tier: SpatialExpansionTier.TIER_4_RES4,
      targetCells: [BigInt('0x' + res4Str)],
      resolution: 4
    };
  }

  /**
   * Instant Collapse upon receipt of reverse signed ACK
   */
  public static collapseToDirect(lastKnownH3Res9: bigint): ISpatialSearchScope {
    return {
      tier: SpatialExpansionTier.TIER_1_RES9,
      targetCells: [lastKnownH3Res9],
      resolution: 9
    };
  }
}
