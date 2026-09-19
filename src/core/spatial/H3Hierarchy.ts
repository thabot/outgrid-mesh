/**
 * H3 Hierarchy Fallback & Multi-Resolution Spatial Aggregation
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Spatial Layer
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { cellToParent, getResolution } from 'h3-js';

export class H3Hierarchy {
  /**
   * Aggregates fine-grained H3 cell into target parent resolution
   * Res 9 (~100m, roof level) -> Res 7 (~1.2km, neighborhood) -> Res 5 (~8.8km, district)
   */
  public static toParentResolution(h3Index: bigint, targetResolution: number): bigint {
    const h3String = h3Index.toString(16);
    const currentRes = getResolution(h3String);

    if (currentRes <= targetResolution) {
      return h3Index;
    }

    const parentString = cellToParent(h3String, targetResolution);
    return BigInt('0x' + parentString);
  }

  /**
   * Generates a 3-tier hierarchical spatial index bundle for a given location
   * [Res 9, Res 7, Res 5]
   */
  public static getHierarchyBundle(h3IndexRes9: bigint): { res9: bigint; res7: bigint; res5: bigint } {
    const res7 = this.toParentResolution(h3IndexRes9, 7);
    const res5 = this.toParentResolution(h3IndexRes9, 5);
    return {
      res9: h3IndexRes9,
      res7,
      res5
    };
  }
}
