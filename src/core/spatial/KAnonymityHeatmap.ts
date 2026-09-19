/**
 * Privacy-Preserving K-Anonymity Heatmap Engine
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { cellToParent } from 'h3-js';

export const MIN_K_ANONYMITY = 3; // Strict rule: At least 3 nodes required to show cluster

export interface IHeatmapCell {
  h3ParentRes7: string;
  nodeCount: number;
  densityLevel: 'low' | 'medium' | 'high';
}

export class KAnonymityHeatmap {
  private cellCounts: Map<string, Set<string>> = new Map();

  /**
   * Registers an anonymous node ping into spatial parent Res 7 hex
   * Truncates exact GPS coordinates to protect citizen identity
   */
  public registerPresence(nodeId: string, nodeH3IndexRes9: bigint): void {
    const parent7 = cellToParent(nodeH3IndexRes9.toString(16), 7);
    let nodeSet = this.cellCounts.get(parent7);
    if (!nodeSet) {
      nodeSet = new Set();
      this.cellCounts.set(parent7, nodeSet);
    }
    nodeSet.add(nodeId);
  }

  /**
   * Returns publicly displayable heatmap cells
   * Suppresses any cell with fewer than K nodes (K-Anonymity Guard)
   */
  public getPublicHeatmap(minK = MIN_K_ANONYMITY): IHeatmapCell[] {
    const result: IHeatmapCell[] = [];

    for (const [parentHex, nodes] of this.cellCounts.entries()) {
      const count = nodes.size;

      // K-Anonymity Privacy Guard: Suppress cells with count < K
      if (count >= minK) {
        let density: 'low' | 'medium' | 'high' = 'low';
        if (count >= 20) {
          density = 'high';
        } else if (count >= 8) {
          density = 'medium';
        }

        result.push({
          h3ParentRes7: parentHex,
          nodeCount: count,
          densityLevel: density
        });
      }
    }

    return result;
  }

  public clear(): void {
    this.cellCounts.clear();
  }
}
