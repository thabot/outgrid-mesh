/**
 * Epidemic Gossip & Targeted Flood Router
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Routing Engine
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { cellToParent } from 'h3-js';
import type { ITOGPacket } from '../protocol/TOGPacket';
import type { BloomFilter } from '../protocol/BloomFilter';

export interface INeighborNode {
  nodeId: string;
  h3Index: bigint;
  rssi: number; // Signal strength in dBm (-30 dBm strong to -95 dBm weak)
  lastSeenAt: number;
  batteryPct?: number; // 0 - 100%
  isStationary?: boolean;
  radioCode?: number;  // RadioCombinationCode
  isLegacyBt?: boolean; // Flag indicating BT 4.2 / Legacy 1M Node (Leaf node only, restricted from being intermediate relay)
  supportsLeCodedPhy?: boolean; // True if node supports BLE 5.0 Long Range Coded PHY
}

export interface IPeerSelectionConfig {
  maxTargetNeighbors: number; // Configured target number of peer neighbors (e.g. 5)
}

export class EpidemicRouter {
  private bloomFilter: BloomFilter;
  private myNodeId: string;
  private myH3Index: bigint;
  private neighbors: Map<string, INeighborNode> = new Map();
  private peerSelectionConfig: IPeerSelectionConfig;

  public static LEGACY_PEER_TTL_MS = 30000;  // 30 seconds TTL for BT 4.2 Legacy
  public static MODERN_PEER_TTL_MS = 120000; // 120 seconds TTL for Modern BLE 5.0 Coded
  public static MIN_RSSI_THRESHOLD = -85;    // Cutoff below -85 dBm for legacy nodes

  constructor(
    myNodeId: string,
    myH3Index: bigint,
    bloomFilter: BloomFilter,
    config: Partial<IPeerSelectionConfig> = {}
  ) {
    this.myNodeId = myNodeId;
    this.myH3Index = myH3Index;
    this.bloomFilter = bloomFilter;
    this.peerSelectionConfig = {
      maxTargetNeighbors: config.maxTargetNeighbors ?? 5
    };
  }

  /**
   * Registers or updates an active neighbor in the routing table
   */
  public updateNeighbor(neighbor: INeighborNode): void {
    this.neighbors.set(neighbor.nodeId, neighbor);
  }

  /**
   * Calculates dynamic Priority Score for a neighbor:
   * S = (W_radio * 40) + (NormRSSI * 25) + (BatteryPct * 20) + (Stationary * 15)
   */
  public calculateNeighborScore(neighbor: INeighborNode): number {
    // 1. Radio Weight (0 to 1.0)
    let wRadio = 0.5;
    if (neighbor.supportsLeCodedPhy && !neighbor.isLegacyBt) {
      wRadio = 1.0;
    } else if (neighbor.isLegacyBt) {
      wRadio = 0.2;
    }

    // 2. Normalized RSSI (0 to 1.0) from [-95 dBm, -30 dBm]
    const clampedRssi = Math.min(-30, Math.max(-95, neighbor.rssi));
    const normRssi = (clampedRssi - (-95)) / ((-30) - (-95));

    // 3. Battery Pct (0 to 1.0)
    const normBat = Math.min(100, Math.max(0, neighbor.batteryPct ?? 100)) / 100;

    // 4. Stationary bonus (0 or 1.0)
    const normStat = neighbor.isStationary ? 1.0 : 0.0;

    return (wRadio * 40) + (normRssi * 25) + (normBat * 20) + (normStat * 15);
  }

  /**
   * Prioritized Neighbor Selection with Quota Constraints:
   * Total Quota: maxTargetNeighbors (default: 5)
   * - Modern BLE 5.0 Coded Nodes >= 3
   * - Legacy BT 4.2 Nodes <= 2
   */
  public getSelectedRoutingNeighbors(now = Date.now()): INeighborNode[] {
    this.evictExpiredNeighbors(now);

    const allNeighbors = Array.from(this.neighbors.values());

    // 1. Partition into modern BLE and legacy BT
    const modernNodes = allNeighbors.filter((n) => !n.isLegacyBt);
    const legacyNodes = allNeighbors.filter((n) => n.isLegacyBt && n.rssi >= EpidemicRouter.MIN_RSSI_THRESHOLD);

    // Sort both by Priority Score descending
    modernNodes.sort((a, b) => this.calculateNeighborScore(b) - this.calculateNeighborScore(a));
    legacyNodes.sort((a, b) => this.calculateNeighborScore(b) - this.calculateNeighborScore(a));

    const quota = this.peerSelectionConfig.maxTargetNeighbors;
    const maxLegacyQuota = 2; // Strict limit of <= 2 legacy peers

    // Select modern nodes first (up to quota, minimum target 3)
    const selectedModern = modernNodes.slice(0, quota);
    const remainingSlots = Math.max(0, quota - selectedModern.length);

    // Allow legacy nodes to fill remaining slots up to maxLegacyQuota
    const legacySlotsAllowed = Math.min(maxLegacyQuota, remainingSlots);
    const selectedLegacy = legacyNodes.slice(0, legacySlotsAllowed);

    return [...selectedModern, ...selectedLegacy];
  }

  /**
   * Selects Candidate Relays to forward an outbound or multi-hop packet:
   * CRITICAL RULE: Never select Legacy BT nodes as intermediate relays!
   * Legacy BT nodes only have ~10-30m range and cannot carry messages across long distances.
   * Only select Legacy BT if the message is directly targeted to that legacy node.
   */
  public selectRelayCandidates(
    packet: ITOGPacket,
    targetRecipientNodeId?: string
  ): INeighborNode[] {
    const activeNeighbors = this.getSelectedRoutingNeighbors();

    // If destination is a known direct neighbor, deliver directly
    if (targetRecipientNodeId) {
      const directTarget = activeNeighbors.find((n) => n.nodeId === targetRecipientNodeId);
      if (directTarget) {
        return [directTarget];
      }
    }

    // For multi-hop / spatial gossip (Hops > 1 or forwarding to distant cells):
    // Strictly EXCLUDE any node with isLegacyBt: true from serving as intermediate relay!
    return activeNeighbors.filter((neighbor) => !neighbor.isLegacyBt);
  }

  /**
   * Purges expired neighbors based on hardware tier TTL
   */
  public evictExpiredNeighbors(now = Date.now()): number {
    let evicted = 0;
    for (const [id, neighbor] of this.neighbors.entries()) {
      const ttl = neighbor.isLegacyBt
        ? EpidemicRouter.LEGACY_PEER_TTL_MS
        : EpidemicRouter.MODERN_PEER_TTL_MS;

      if (now - neighbor.lastSeenAt > ttl || (neighbor.isLegacyBt && neighbor.rssi < EpidemicRouter.MIN_RSSI_THRESHOLD)) {
        this.neighbors.delete(id);
        evicted++;
      }
    }
    return evicted;
  }

  /**
   * Evaluates if an incoming packet should be forwarded (Gossip decision)
   * Anti-Loop: Checks Bloom Filter to prevent broadcast storms
   */
  public shouldForward(packet: ITOGPacket): boolean {
    // 1. If TTL <= 1, drop it (cannot hop further)
    if (packet.header.ttlHops <= 1) {
      return false;
    }

    // 2. Check if we have already forwarded or seen this Message ID (Anti-Loop Guard)
    if (this.bloomFilter.has(packet.messageId)) {
      return false; // Suppress duplicate!
    }

    return true;
  }

  /**
   * Prepares packet for relay: decrements TTL and registers ID into Bloom Filter
   */
  public relayPacket(packet: ITOGPacket): ITOGPacket | null {
    if (!this.shouldForward(packet)) {
      return null;
    }

    // Register into Bloom Filter to ensure we don't relay it again
    this.bloomFilter.add(packet.messageId);

    // Decrement TTL / Hop count
    const forwardedPacket: ITOGPacket = {
      ...packet,
      header: {
        ...packet.header,
        ttlHops: packet.header.ttlHops - 1
      }
    };

    return forwardedPacket;
  }

  /**
   * Determines if a packet has reached its intended spatial hexagon destination (H3 Match)
   * Checks at Resolution 9, with parent fallback to Resolution 7
   */
  public isLocalDestination(packetTargetH3: bigint): boolean {
    if (packetTargetH3 === 0n) {
      return true; // Global broadcast
    }

    if (this.myH3Index === packetTargetH3) {
      return true; // Exact Res 9 match
    }

    // Fallback: Check parent Res 7 match (~1.2km neighborhood)
    try {
      const myParent7 = cellToParent(this.myH3Index.toString(16), 7);
      const targetParent7 = cellToParent(packetTargetH3.toString(16), 7);
      return myParent7 === targetParent7;
    } catch {
      return false;
    }
  }

  public getNeighborCount(): number {
    return this.neighbors.size;
  }

  public clearNeighbors(): void {
    this.neighbors.clear();
  }
}
