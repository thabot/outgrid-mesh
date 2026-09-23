/**
 * Spatial Diversity Neighbor Selector & Priority Scoring Engine
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Wire Specification & Spatial Mesh Routing
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { H3Direction, type IPresenceNeighbor } from '../protocol/TOGPacket';
import { H3GridEngine, type IH3Coordinate } from './H3GridEngine';

export interface INeighborCandidate {
  shortNodeId: number;         // 16-bit short ID (e.g. 0x47A1)
  lat: number;
  lng: number;
  h3Index?: bigint;
  rssi: number;                // dBm (e.g. -65)
  rssiTier?: number;           // 0-3 (0=Weak, 1=Moderate, 2=Good, 3=Strong)
  batteryLevel?: number;       // 1-5 bars
  batteryPct?: number;         // 0-100%
  isStationary?: boolean;
  isLegacyBt?: boolean;
  supportsLeCodedPhy?: boolean;
  isFriend?: boolean;
  isSos?: boolean;
  distanceMeters?: number;
  lastSeen?: number;
}

export interface IScoredNeighborCandidate extends INeighborCandidate {
  direction: H3Direction;
  score: number;
  resolvedRssiTier: number;
  resolvedBatteryBars: number;
}

export class SpatialNeighborSelector {
  public static readonly MAX_NEIGHBORS = 5;
  public static readonly MAX_LEGACY_QUOTA = 2;
  public static readonly MIN_RSSI_LEGACY = -85;

  /**
   * Calculates Priority Score (0 to 100) for a neighbor node:
   * S = (W_radio * 40) + (NormRSSI * 25) + (BatteryPct * 20) + (Stationary * 15) + (FriendBonus * 10) (clamped to 100)
   */
  public static calculateScore(candidate: INeighborCandidate): number {
    // 1. Radio Weight (0.2 to 1.0)
    let wRadio = 0.5;
    if (candidate.supportsLeCodedPhy && !candidate.isLegacyBt) {
      wRadio = 1.0;
    } else if (candidate.isLegacyBt) {
      wRadio = 0.2;
    }

    // 2. Normalized RSSI (0.0 to 1.0) from [-95 dBm, -30 dBm]
    const clampedRssi = Math.min(-30, Math.max(-95, candidate.rssi));
    const normRssi = (clampedRssi - (-95)) / ((-30) - (-95));

    // 3. Battery Pct (0.0 to 1.0)
    let normBat = 1.0;
    if (candidate.batteryPct !== undefined) {
      normBat = Math.min(100, Math.max(0, candidate.batteryPct)) / 100;
    } else if (candidate.batteryLevel !== undefined) {
      normBat = Math.min(5, Math.max(1, candidate.batteryLevel)) / 5;
    }

    // 4. Stationary bonus (0 or 1.0)
    const normStat = candidate.isStationary ? 1.0 : 0.0;

    // 5. Friend bonus (0 or 1.0)
    const friendBonus = candidate.isFriend ? 1.0 : 0.0;

    const rawScore = (wRadio * 40) + (normRssi * 25) + (normBat * 20) + (normStat * 15) + (friendBonus * 10);
    return Math.min(100, Math.max(0, rawScore));
  }

  /**
   * Combines direction, battery level, and RSSI tier into 1 Fused Byte (uint8)
   */
  public static packFusedByte(direction: H3Direction, batteryLevel: number, rssiTier: number): number {
    return (direction & 0x07) | ((batteryLevel & 0x07) << 3) | ((rssiTier & 0x03) << 6);
  }

  /**
   * Extracts direction, battery level, and RSSI tier from 1 Fused Byte (uint8)
   */
  public static unpackFusedByte(fused: number): { direction: H3Direction; batteryLevel: number; rssiTier: number } {
    return {
      direction: (fused & 0x07) as H3Direction,
      batteryLevel: (fused >> 3) & 0x07,
      rssiTier: (fused >> 6) & 0x03
    };
  }

  /**
   * Resolves RSSI level to 2-bit RSSI Tier (0 to 3)
   */
  public static resolveRssiTier(rssiDbm: number, existingTier?: number): number {
    if (existingTier !== undefined && existingTier >= 0 && existingTier <= 3) {
      return existingTier;
    }
    if (rssiDbm > -60) return 3;       // Excellent
    if (rssiDbm > -75) return 2;       // Good
    if (rssiDbm > -85) return 1;       // Moderate
    return 0;                          // Weak
  }

  /**
   * Resolves Battery level to 3-bit Battery Bars (1 to 5)
   */
  public static resolveBatteryBars(batteryLevel?: number, batteryPct?: number): number {
    if (batteryLevel !== undefined) {
      return Math.min(5, Math.max(1, Math.round(batteryLevel)));
    }
    if (batteryPct !== undefined) {
      return Math.min(5, Math.max(1, Math.ceil(batteryPct / 20)));
    }
    return 5;
  }

  /**
   * Selects up to 5 best neighbors balancing 6-direction H3 spatial diversity and priority score
   */
  public static selectBestNeighbors(
    origin: IH3Coordinate,
    candidates: INeighborCandidate[],
    originH3?: bigint,
    maxSlots: number = SpatialNeighborSelector.MAX_NEIGHBORS
  ): IPresenceNeighbor[] {
    const res = this.selectRotatingNeighbors(origin, candidates, 0, originH3, maxSlots);
    return res.neighbors;
  }

  /**
   * Selects up to 5 neighbors with Direction-Aware Round-Robin and 500m Filtering
   */
  public static selectRotatingNeighbors(
    origin: IH3Coordinate,
    candidates: INeighborCandidate[],
    currentWindowOffset: number = 0,
    originH3?: bigint,
    maxSlots: number = SpatialNeighborSelector.MAX_NEIGHBORS
  ): { neighbors: IPresenceNeighbor[]; nextOffset: number } {
    if (!candidates || candidates.length === 0) {
      return { neighbors: [], nextOffset: 0 };
    }

    // 1. Distance & Validity Filter: <= 500m unless SOS or Friend
    const inRange = candidates.filter((c) => {
      if (!c.shortNodeId || c.shortNodeId === 0) return false;
      if (c.isLegacyBt && c.rssi < SpatialNeighborSelector.MIN_RSSI_LEGACY) return false;
      if (c.isSos || c.isFriend) return true;
      if (c.distanceMeters !== undefined && c.distanceMeters > 500) return false;
      return true;
    });

    if (inRange.length === 0) {
      return { neighbors: [], nextOffset: 0 };
    }

    // 2. Modern-First Strict Rule
    const modernNodes = inRange.filter((c) => !c.isLegacyBt);
    const pool = modernNodes.length >= maxSlots ? modernNodes : inRange;

    // 3. Score and resolve direction
    const scoredList: IScoredNeighborCandidate[] = pool.map((c) => {
      const direction = H3GridEngine.calculateH3Direction(
        origin,
        { lat: c.lat, lng: c.lng },
        originH3,
        c.h3Index
      );
      const score = this.calculateScore(c);
      const resolvedRssiTier = this.resolveRssiTier(c.rssi, c.rssiTier);
      const resolvedBatteryBars = this.resolveBatteryBars(c.batteryLevel, c.batteryPct);

      return {
        ...c,
        direction,
        score,
        resolvedRssiTier,
        resolvedBatteryBars
      };
    });

    // 4. Bucket by direction (0 to 6)
    const buckets = new Map<H3Direction, IScoredNeighborCandidate[]>();
    for (let d = 0; d <= 6; d++) {
      buckets.set(d as H3Direction, []);
    }

    for (const item of scoredList) {
      buckets.get(item.direction)!.push(item);
    }

    // Sort candidates within each directional bucket by score descending
    for (const list of buckets.values()) {
      list.sort((a, b) => b.score - a.score);
    }

    // 5. Direction-Aware Round-Robin pick
    const selected: IScoredNeighborCandidate[] = [];
    const selectedIds = new Set<number>();
    const maxDepth = Math.max(...Array.from(buckets.values()).map((b) => b.length), 1);
    const startDepth = currentWindowOffset % maxDepth;

    const directionalOrder: H3Direction[] = [
      H3Direction.NORTH,
      H3Direction.NORTH_EAST,
      H3Direction.SOUTH_EAST,
      H3Direction.SOUTH,
      H3Direction.SOUTH_WEST,
      H3Direction.NORTH_WEST,
      H3Direction.SAME_CELL
    ];

    for (let cycle = 0; cycle < maxDepth && selected.length < maxSlots; cycle++) {
      const depth = (startDepth + cycle) % maxDepth;
      for (const dir of directionalOrder) {
        if (selected.length >= maxSlots) break;
        const bucket = buckets.get(dir)!;
        if (bucket.length > depth) {
          const candidate = bucket[depth];
          if (!selectedIds.has(candidate.shortNodeId)) {
            selected.push(candidate);
            selectedIds.add(candidate.shortNodeId);
          }
        }
      }
    }

    // Greedy fallback if still under maxSlots
    if (selected.length < maxSlots) {
      const remaining = scoredList
        .filter((c) => !selectedIds.has(c.shortNodeId))
        .sort((a, b) => b.score - a.score);

      for (const c of remaining) {
        if (selected.length >= maxSlots) break;
        selected.push(c);
        selectedIds.add(c.shortNodeId);
      }
    }

    const neighbors = selected.map((s) => ({
      shortNodeId: s.shortNodeId & 0xffff,
      direction: s.direction,
      batteryLevel: s.resolvedBatteryBars,
      rssiTier: s.resolvedRssiTier
    }));

    return {
      neighbors,
      nextOffset: (startDepth + 1) % maxDepth
    };
  }
}
