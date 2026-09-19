/**
 * Tiered TTL & Expiry Manager
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Expiry Policy
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { TOGPacketType } from '../protocol/TOGPacket';
import type { SqliteStorageEngine } from './SqliteStorageEngine';

export const TTL_SOS_BEACON_MS = 72 * 60 * 60 * 1000;    // 72 Hours life preservation
export const TTL_DIRECT_CHAT_MS = 24 * 60 * 60 * 1000;   // 24 Hours standard chat
export const TTL_CRISIS_FEED_MS = 48 * 60 * 60 * 1000;   // 48 Hours disaster alerts
export const TTL_PRESENCE_MS = 1 * 60 * 60 * 1000;       // 1 Hour presence chirp

export class TieredTtlManager {
  /**
   * Returns expiry duration in ms based on packet type
   */
  public static getTtlDuration(packetType: TOGPacketType): number {
    switch (packetType) {
      case TOGPacketType.SOS_BEACON:
        return TTL_SOS_BEACON_MS;
      case TOGPacketType.CRISIS_FEED:
        return TTL_CRISIS_FEED_MS;
      case TOGPacketType.DIRECT_CHAT:
      case TOGPacketType.GROUP_CHAT:
        return TTL_DIRECT_CHAT_MS;
      case TOGPacketType.PRESENCE_CHIRP:
        return TTL_PRESENCE_MS;
      default:
        return TTL_DIRECT_CHAT_MS;
    }
  }

  /**
   * Scans storage and purges expired messages
   * Returns count of purged messages
   */
  public static pruneExpired(storage: SqliteStorageEngine, currentTime = Date.now()): number {
    const allMessages = storage.getAllMessages();
    let purgedCount = 0;

    for (const msg of allMessages) {
      if (currentTime >= msg.expiresAt) {
        storage.deleteMessage(msg.id);
        purgedCount++;
      }
    }

    return purgedCount;
  }
}
