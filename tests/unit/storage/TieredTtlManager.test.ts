/**
 * Unit tests for TieredTtlManager (SOS 72h protection, Chat 24h prune)
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, expect, it } from 'bun:test';
import {
  TieredTtlManager,
  TTL_SOS_BEACON_MS,
  TTL_DIRECT_CHAT_MS,
  TTL_PRESENCE_MS
} from '../../../src/core/storage/TieredTtlManager';
import { TOGPacketType } from '../../../src/core/protocol/TOGPacket';
import { SqliteStorageEngine } from '../../../src/core/storage/SqliteStorageEngine';
import type { IStoredMessage } from '../../../src/core/storage/schema';

describe('TieredTtlManager (Tiered Expiry & Auto-Prune)', () => {
  it('should return correct TTL duration for each packet tier', () => {
    expect(TieredTtlManager.getTtlDuration(TOGPacketType.SOS_BEACON)).toBe(TTL_SOS_BEACON_MS);
    expect(TieredTtlManager.getTtlDuration(TOGPacketType.DIRECT_CHAT)).toBe(TTL_DIRECT_CHAT_MS);
    expect(TieredTtlManager.getTtlDuration(TOGPacketType.PRESENCE_CHIRP)).toBe(TTL_PRESENCE_MS);
  });

  it('should prune expired messages while keeping unexpired messages intact', () => {
    const storage = new SqliteStorageEngine();
    const now = 1000000;

    const expiredMsg: IStoredMessage = {
      id: 'expired-1',
      packetType: TOGPacketType.DIRECT_CHAT,
      priority: 8,
      senderHash: 'a',
      recipientHash: 'b',
      targetH3Index: 'h',
      payload: new Uint8Array(10),
      payloadSize: 10,
      createdAt: now - 5000,
      expiresAt: now - 100, // Expired!
      isDelivered: false,
      deliveryStatus: 'pending',
      isProtected: false
    };

    const activeMsg: IStoredMessage = {
      id: 'active-1',
      packetType: TOGPacketType.SOS_BEACON,
      priority: 15,
      senderHash: 'a',
      recipientHash: 'b',
      targetH3Index: 'h',
      payload: new Uint8Array(10),
      payloadSize: 10,
      createdAt: now,
      expiresAt: now + 50000, // Still active!
      isDelivered: false,
      deliveryStatus: 'pending',
      isProtected: true
    };

    storage.saveMessage(expiredMsg);
    storage.saveMessage(activeMsg);

    expect(storage.getMessageCount()).toBe(2);

    const purged = TieredTtlManager.pruneExpired(storage, now);
    expect(purged).toBe(1);

    expect(storage.getMessage('expired-1')).toBeUndefined();
    expect(storage.getMessage('active-1')).toBeDefined();
  });
});
