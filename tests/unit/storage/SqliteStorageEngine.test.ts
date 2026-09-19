/**
 * Unit tests for SqliteStorageEngine (50MB FIFO Ceiling & Schema)
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, expect, it } from 'bun:test';
import { SqliteStorageEngine } from '../../../src/core/storage/SqliteStorageEngine';
import type { IStoredMessage } from '../../../src/core/storage/schema';

describe('SqliteStorageEngine (50MB FIFO Ceiling & CRUD)', () => {
  it('should save and retrieve stored messages', () => {
    const storage = new SqliteStorageEngine();
    const msg: IStoredMessage = {
      id: '0011223344556677',
      packetType: 0x02,
      priority: 8,
      senderHash: 'aabbccdd',
      recipientHash: '11223344',
      targetH3Index: '88654c5525fffff0',
      payload: new Uint8Array([1, 2, 3, 4, 5]),
      payloadSize: 5,
      createdAt: 1000,
      expiresAt: 5000,
      isDelivered: false,
      deliveryStatus: 'pending',
      isProtected: false
    };

    storage.saveMessage(msg);
    const retrieved = storage.getMessage('0011223344556677');
    expect(retrieved).toBeDefined();
    expect(retrieved?.isDelivered).toBe(false);

    storage.updateDeliveryStatus('0011223344556677', 'delivered');
    const updated = storage.getMessage('0011223344556677');
    expect(updated?.isDelivered).toBe(true);
    expect(updated?.deliveryStatus).toBe('delivered');
  });

  it('should enforce FIFO eviction on non-protected messages when capacity is exceeded', () => {
    // Capacity limit of 300 bytes for testing
    const storage = new SqliteStorageEngine(300);

    // Message 1 (100B, Oldest)
    storage.saveMessage({
      id: 'msg-1',
      packetType: 0x02,
      priority: 8,
      senderHash: 'a',
      recipientHash: 'b',
      targetH3Index: 'h1',
      payload: new Uint8Array(100),
      payloadSize: 100,
      createdAt: 100,
      expiresAt: 1000,
      isDelivered: false,
      deliveryStatus: 'pending',
      isProtected: false
    });

    // Message 2 (100B)
    storage.saveMessage({
      id: 'msg-2',
      packetType: 0x02,
      priority: 8,
      senderHash: 'a',
      recipientHash: 'b',
      targetH3Index: 'h1',
      payload: new Uint8Array(100),
      payloadSize: 100,
      createdAt: 200,
      expiresAt: 1000,
      isDelivered: false,
      deliveryStatus: 'pending',
      isProtected: false
    });

    // Message 3 (100B)
    storage.saveMessage({
      id: 'msg-3',
      packetType: 0x02,
      priority: 8,
      senderHash: 'a',
      recipientHash: 'b',
      targetH3Index: 'h1',
      payload: new Uint8Array(100),
      payloadSize: 100,
      createdAt: 300,
      expiresAt: 1000,
      isDelivered: false,
      deliveryStatus: 'pending',
      isProtected: false
    });

    expect(storage.getMessageCount()).toBe(3);

    // Message 4 (150B) -> Exceeds 300B, must evict msg-1 and msg-2
    storage.saveMessage({
      id: 'msg-4',
      packetType: 0x02,
      priority: 8,
      senderHash: 'a',
      recipientHash: 'b',
      targetH3Index: 'h1',
      payload: new Uint8Array(150),
      payloadSize: 150,
      createdAt: 400,
      expiresAt: 1000,
      isDelivered: false,
      deliveryStatus: 'pending',
      isProtected: false
    });

    expect(storage.getMessage('msg-1')).toBeUndefined(); // Evicted!
    expect(storage.getMessage('msg-2')).toBeUndefined(); // Evicted!
    expect(storage.getMessage('msg-3')).toBeDefined();
    expect(storage.getMessage('msg-4')).toBeDefined();
    expect(storage.getTotalBytes()).toBeLessThanOrEqual(300);
  });

  it('should NEVER evict protected SOS messages during capacity pressure', () => {
    const storage = new SqliteStorageEngine(200);

    // Critical SOS message (100B, Protected)
    storage.saveMessage({
      id: 'sos-critical',
      packetType: 0x01,
      priority: 15,
      senderHash: 'victim',
      recipientHash: 'broadcast',
      targetH3Index: 'h3',
      payload: new Uint8Array(100),
      payloadSize: 100,
      createdAt: 10,
      expiresAt: 99999,
      isDelivered: false,
      deliveryStatus: 'pending',
      isProtected: true // Protected!
    });

    // Chat message (100B, Non-protected)
    storage.saveMessage({
      id: 'chat-casual',
      packetType: 0x02,
      priority: 8,
      senderHash: 'user1',
      recipientHash: 'user2',
      targetH3Index: 'h3',
      payload: new Uint8Array(100),
      payloadSize: 100,
      createdAt: 20,
      expiresAt: 99999,
      isDelivered: false,
      deliveryStatus: 'pending',
      isProtected: false
    });

    // Incoming new message (100B)
    storage.saveMessage({
      id: 'chat-incoming',
      packetType: 0x02,
      priority: 8,
      senderHash: 'user3',
      recipientHash: 'user4',
      targetH3Index: 'h3',
      payload: new Uint8Array(100),
      payloadSize: 100,
      createdAt: 30,
      expiresAt: 99999,
      isDelivered: false,
      deliveryStatus: 'pending',
      isProtected: false
    });

    // Chat-casual must be evicted, but SOS-critical MUST remain protected!
    expect(storage.getMessage('sos-critical')).toBeDefined();
    expect(storage.getMessage('chat-casual')).toBeUndefined();
    expect(storage.getMessage('chat-incoming')).toBeDefined();
  });
});
