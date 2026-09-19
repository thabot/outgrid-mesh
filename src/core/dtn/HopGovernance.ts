/**
 * Hop Freeze & Extended TTL Governance Engine
 * Protocol: TOG v1.1 Master Project Plan v6.1 Phase 6 Task 6.3
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import type { IDtnBundle } from './BundleStore';

export const TTL_EXTENDED_SOS_MS = 14 * 24 * 60 * 60 * 1000;   // 14 Days
export const TTL_EXTENDED_CHAT_MS = 7 * 24 * 60 * 60 * 1000;   // 7 Days

export class HopGovernance {
  /**
   * Applies Hop Freeze rule while bundle is carried by a Data Mule
   * Prevents premature packet drop during long-distance inter-district transit
   */
  public static processHop(bundle: IDtnBundle, isCarriedByMule: boolean): number {
    if (isCarriedByMule) {
      // Hop Freeze engaged: Hop count is NOT decremented/incremented
      bundle.isHopFrozen = true;
      return bundle.hopCount;
    }

    bundle.isHopFrozen = false;
    bundle.hopCount += 1;
    return bundle.hopCount;
  }

  /**
   * Returns Extended TTL for DTN Bundles (7 to 14 days)
   */
  public static getExtendedTtl(isSos: boolean): number {
    return isSos ? TTL_EXTENDED_SOS_MS : TTL_EXTENDED_CHAT_MS;
  }
}
