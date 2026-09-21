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
   * Prioritized Neighbor Selection:
   * 1. Prioritizes BLE 5.0 / Modern nodes first up to maxTargetNeighbors
   * 2. If BLE 5.0 nodes < maxTargetNeighbors, falls back to include BT 4.2 Legacy nodes
   *    (which have isLegacyBt: true) to fulfill the configured quota.
   */
  public getSelectedRoutingNeighbors(): INeighborNode[] {
    const allNeighbors = Array.from(this.neighbors.values());

    // 1. Partition into modern BLE and legacy BT
    const modernNodes = allNeighbors.filter((n) => !n.isLegacyBt);
    const legacyNodes = allNeighbors.filter((n) => n.isLegacyBt);

    // Sort both by signal quality (RSSI descending)
    modernNodes.sort((a, b) => b.rssi - a.rssi);
    legacyNodes.sort((a, b) => b.rssi - a.rssi);

    const quota = this.peerSelectionConfig.maxTargetNeighbors;

    // First fill quota with modern BLE nodes
    const selected: INeighborNode[] = modernNodes.slice(0, quota);

    // If quota not reached, conditionally fallback to legacy BT nodes
    if (selected.length < quota) {
      const remainingQuota = quota - selected.length;
      const fallbackLegacy = legacyNodes.slice(0, remainingQuota);
      selected.push(...fallbackLegacy);
    }

    return selected;
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
