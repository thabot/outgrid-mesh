/**
 * Deterministic Supernode Election Algorithm & LoRa Gateway Promotion
 * Protocol: TOG v1.1 Master Project Plan v6.1 Phase 5 Task 5.3
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export interface INodeCandidateMetrics {
  nodeId: string;
  batteryLevel: number;        // 0 - 100
  isCharging: boolean;          // Wall / Car Charger plugged in
  hasLoraGateway: boolean;      // Active BLE LoRa Companion Bridge connected
  availableRamMb: number;       // Free memory
  linkStabilityScore: number;   // 0 - 100 based on packet relay uptime
  h3ZoneRes7: bigint;           // Resident H3 Res 7 cell
}

export enum NodeRole {
  NORMAL_PEER = 'NORMAL_PEER',
  STANDBY_SUPERNODE = 'STANDBY_SUPERNODE',
  ZONE_MASTER_SUPERNODE = 'ZONE_MASTER_SUPERNODE',
  TIER1_LORA_BACKBONE_GATEWAY = 'TIER1_LORA_BACKBONE_GATEWAY'
}

export class SupernodeElection {
  /**
   * Calculates node fitness score (0 to 200+)
   * LoRa Bridge Bonus: +100
   * Charging Bonus: +40
   * Battery contribution: up to +30
   * RAM & Stability contribution: up to +30
   */
  public static calculateFitnessScore(metrics: INodeCandidateMetrics): number {
    let score = 0;

    // 1. Tier-1 LoRa Gateway Override (+100)
    if (metrics.hasLoraGateway) {
      score += 100;
    }

    // 2. Charging Status (+40)
    if (metrics.isCharging) {
      score += 40;
    }

    // 3. Battery Level (+0 to +30)
    score += Math.min(30, Math.floor((metrics.batteryLevel / 100) * 30));

    // 4. Memory availability (+0 to +15)
    score += Math.min(15, Math.floor((metrics.availableRamMb / 1024) * 15));

    // 5. Link stability (+0 to +15)
    score += Math.min(15, Math.floor((metrics.linkStabilityScore / 100) * 15));

    return score;
  }

  /**
   * Evaluates role transition based on criteria
   * Demotes to NORMAL_PEER if battery < 30% and not charging / no LoRa
   */
  public static evaluateRole(
    metrics: INodeCandidateMetrics,
    rankInZone: number = 1 // 1 = Highest score in H3 Res 7 Zone
  ): NodeRole {
    // Override 1: Connected to LoRa Hardware Bridge -> Always Tier 1 Gateway
    if (metrics.hasLoraGateway) {
      return NodeRole.TIER1_LORA_BACKBONE_GATEWAY;
    }

    // Safety Battery Guard: If battery < 30% and not plugged into charger -> Demote immediately
    if (metrics.batteryLevel < 30 && !metrics.isCharging) {
      return NodeRole.NORMAL_PEER;
    }

    // Must have battery > 50% or be charging to qualify as supernode
    if (metrics.batteryLevel <= 50 && !metrics.isCharging) {
      return NodeRole.NORMAL_PEER;
    }

    // Zone Supernode Election: 1 Master + up to 2 Standby Backups per H3 Res 7
    if (rankInZone === 1) {
      return NodeRole.ZONE_MASTER_SUPERNODE;
    } else if (rankInZone <= 3) {
      return NodeRole.STANDBY_SUPERNODE;
    }

    return NodeRole.NORMAL_PEER;
  }
}
