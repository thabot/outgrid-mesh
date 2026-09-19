/**
 * Unit tests for Phase 4 Storage, Quota Clamping & Bloom Filter
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, expect, it, beforeEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { SQLITE_INIT_MIGRATION_SQL } from '../../../src/core/storage/DatabaseSchema';
import { SqliteStorageEngine } from '../../../src/core/storage/SqliteStorageEngine';
import { StorageManager } from '../../../src/core/storage/StorageManager';
import { BloomFilter, LruMessageCache } from '../../../src/core/mesh/BloomFilter';
import type { IStoredMessage } from '../../../src/core/storage/schema';

describe('Phase 4: Local Storage, SQLite Schema, Quota Clamping & Bloom Filter', () => {
  describe('Task 4.1: SQLite Database Engine & Migration Schema', () => {
    it('should successfully execute SQLite migration SQL and create tables: messages, peers, dtn_bundles, vector_tiles', () => {
      const db = new Database(':memory:');
      db.run(SQLITE_INIT_MIGRATION_SQL);

      const tables = db.query<{ name: string }, []>(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
      ).all();

      const tableNames = tables.map(t => t.name);
      expect(tableNames).toContain('messages');
      expect(tableNames).toContain('peers');
      expect(tableNames).toContain('dtn_bundles');
      expect(tableNames).toContain('vector_tiles');
    });
  });

  describe('Task 4.2: Strict 50MB Storage Quota Clamping & Auto-Pruning', () => {
    it('should enforce quota clamping and protect critical SOS messages from eviction', () => {
      // 1000 bytes max quota for quick unit test
      const maxQuota = 1000;
      const storage = new SqliteStorageEngine(maxQuota);
      const manager = new StorageManager(storage, maxQuota);

      // Add SOS message (Protected)
      const sosMsg: IStoredMessage = {
        id: 'sos-01',
        packetType: 0x01,
        priority: 0x0F,
        senderHash: 'aabbccdd',
        recipientHash: 'ffffffff',
        targetH3Index: '88654c5525fffff',
        payload: new Uint8Array(400),
        payloadSize: 400,
        createdAt: 1000,
        expiresAt: Date.now() + 72 * 3600 * 1000,
        isDelivered: false,
        deliveryStatus: 'pending',
        isProtected: true // Protected
      };
      storage.saveMessage(sosMsg);

      // Add Presence Chirp (Unprotected)
      const chirpMsg: IStoredMessage = {
        id: 'chirp-01',
        packetType: 0x07,
        priority: 0x01,
        senderHash: '11223344',
        recipientHash: '00000000',
        targetH3Index: '88654c5525fffff',
        payload: new Uint8Array(300),
        payloadSize: 300,
        createdAt: 2000,
        expiresAt: Date.now() + 3600 * 1000,
        isDelivered: false,
        deliveryStatus: 'pending',
        isProtected: false
      };
      storage.saveMessage(chirpMsg);

      // Add Regular Chat (Unprotected, will overflow quota if added)
      const chatMsg: IStoredMessage = {
        id: 'chat-01',
        packetType: 0x02,
        priority: 0x08,
        senderHash: '55667788',
        recipientHash: '99887766',
        targetH3Index: '88654c5525fffff',
        payload: new Uint8Array(500),
        payloadSize: 500,
        createdAt: 3000,
        expiresAt: Date.now() + 24 * 3600 * 1000,
        isDelivered: false,
        deliveryStatus: 'pending',
        isProtected: false
      };
      storage.saveMessage(chatMsg);

      // Ensure total bytes does not exceed 1000 bytes
      expect(storage.getTotalBytes()).toBeLessThanOrEqual(maxQuota);

      // SOS message must remain intact
      expect(storage.getMessage('sos-01')).toBeDefined();
    });
  });

  describe('Task 4.3: Counting Bloom Filter & 5,000-entry LRU Duplicate Suppression Cache', () => {
    it('should filter duplicates using Bloom Filter in < 1ms', () => {
      const filter = new BloomFilter(10000, 0.001);
      const testId = 987654321012345678n;

      expect(filter.has(testId)).toBe(false);
      filter.add(testId);
      expect(filter.has(testId)).toBe(true);

      // Measure query time for 1,000 checks
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        filter.has(testId);
      }
      const elapsed = (performance.now() - start) / 1000;
      expect(elapsed).toBeLessThan(1.0); // Sub-millisecond per packet
    });

    it('should maintain 5,000 latest items in LRU Cache and evict oldest', () => {
      const lru = new LruMessageCache(3);
      lru.add('msg-1');
      lru.add('msg-2');
      lru.add('msg-3');

      expect(lru.has('msg-1')).toBe(true);
      expect(lru.has('msg-2')).toBe(true);
      expect(lru.has('msg-3')).toBe(true);

      // Adding 4th item evicts oldest (msg-1)
      lru.add('msg-4');
      expect(lru.has('msg-1')).toBe(false);
      expect(lru.has('msg-4')).toBe(true);
      expect(lru.size()).toBe(3);
    });
  });
});
