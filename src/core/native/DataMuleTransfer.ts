/**
 * Data Mule Zero-Click Exchange Engine
 * Transports disconnected cluster messages physically via emergency vehicles
 * Sucks pending outbox packets without touching screen & offloads to new clusters
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Physical Data Mule Protocol
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { ITOGPacket } from '../protocol/TOGPacket';

export class DataMuleTransfer {
  private muleStorage: Map<string, ITOGPacket> = new Map();
  private maxMuleCapacity: number = 2000; // Capacity for up to 2000 deferred packets

  constructor(maxMuleCapacity = 2000) {
    this.maxMuleCapacity = maxMuleCapacity;
  }

  /**
   * Absorbs (sucks) unsent/relay packets from a stationary disaster cluster
   */
  public absorbFromCluster(clusterPackets: ITOGPacket[]): number {
    let absorbed = 0;
    for (const pkt of clusterPackets) {
      if (this.muleStorage.size >= this.maxMuleCapacity) break;
      const key = pkt.messageId.toString();
      if (!this.muleStorage.has(key)) {
        this.muleStorage.set(key, pkt);
        absorbed++;
      }
    }
    return absorbed;
  }

  /**
   * Offloads eligible packets to a newly encountered cluster
   * Filters out packets already seen by the destination cluster
   */
  public offloadToCluster(knownMessageIds: Set<string>): ITOGPacket[] {
    const toSend: ITOGPacket[] = [];

    for (const [id, pkt] of this.muleStorage.entries()) {
      if (!knownMessageIds.has(id)) {
        toSend.push(pkt);
      }
    }

    return toSend;
  }

  /**
   * Cleans acknowledged packets from Mule cache
   */
  public pruneAcknowledged(acknowledgedIds: string[]): void {
    for (const id of acknowledgedIds) {
      this.muleStorage.delete(id);
    }
  }

  public getStoredPacketCount(): number {
    return this.muleStorage.size;
  }
}
