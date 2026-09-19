/**
 * Dual-Tier Spatial Privacy Engine
 * Tier 1: Public/Guest view aggregates down to H3 Res 7 (~1.2km) density heatmap
 * Tier 2: Verified Emergency Responders view exact Res 9 (~100m) + Delta Offset
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Spatial Privacy Model
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { H3Hierarchy } from '../../src/core/spatial/H3Hierarchy';
import { UserRole } from '../../src/core/auth/AuthManager';

export interface INodeLocationRecord {
  nodeId: string;
  res9Cell: string;
  deltaX: number;
  deltaY: number;
  isSosActive: boolean;
}

export interface IPublicPrivacyView {
  h3Res7Cell: string;
  clusterCount: number;
  hasActiveSos: boolean;
}

export interface IResponderDetailedView {
  nodeId: string;
  res9Cell: string;
  deltaX: number;
  deltaY: number;
  isSosActive: boolean;
}

export class DualTierSpatialPrivacy {
  /**
   * Filters and masks node locations based on requester role
   */
  public static filterLocations(
    records: INodeLocationRecord[],
    requesterRole: UserRole
  ): { publicHeatmap?: IPublicPrivacyView[]; detailedLocations?: IResponderDetailedView[] } {
    const isAuthorizedResponder =
      requesterRole === UserRole.VERIFIED_RESPONDER || requesterRole === UserRole.COORDINATOR;

    if (isAuthorizedResponder) {
      // Tier 2: Return high-precision tactical coordinates for rescue operations
      return {
        detailedLocations: records.map(r => ({
          nodeId: r.nodeId,
          res9Cell: r.res9Cell,
          deltaX: r.deltaX,
          deltaY: r.deltaY,
          isSosActive: r.isSosActive,
        })),
      };
    }

    // Tier 1: Privacy aggregation to H3 Res 7
    const aggregated = new Map<string, { count: number; hasSos: boolean }>();

    for (const r of records) {
      const res9BigInt = BigInt('0x' + r.res9Cell);
      const res7BigInt = H3Hierarchy.toParentResolution(res9BigInt, 7);
      const res7 = res7BigInt.toString(16);

      if (!aggregated.has(res7)) {
        aggregated.set(res7, { count: 0, hasSos: false });
      }
      const item = aggregated.get(res7)!;
      item.count++;
      if (r.isSosActive) item.hasSos = true;
    }

    const publicHeatmap: IPublicPrivacyView[] = [];
    for (const [cell, data] of aggregated.entries()) {
      publicHeatmap.push({
        h3Res7Cell: cell,
        clusterCount: data.count,
        hasActiveSos: data.hasSos,
      });
    }

    return { publicHeatmap };
  }
}
