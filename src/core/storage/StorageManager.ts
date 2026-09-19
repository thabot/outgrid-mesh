/**
 * Storage Quota Manager & Pruning Engine
 * Protocol: TOG v1.1 Master Project Plan v6.1 Phase 4 Task 4.2
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { SqliteStorageEngine } from './SqliteStorageEngine';
import { MAX_STORAGE_BYTES, type IStoredMessage } from './schema';

export class StorageManager {
  private storage: SqliteStorageEngine;
  private quotaCeiling: number;

  constructor(storage: SqliteStorageEngine, quotaCeiling: number = MAX_STORAGE_BYTES) {
    this.storage = storage;
    this.quotaCeiling = quotaCeiling;
  }

  /**
   * Returns current storage size in bytes
   */
  public getCurrentStorageSize(): number {
    return this.storage.getTotalBytes();
  }

  /**
   * Returns quota ceiling in bytes (default 50MB)
   */
  public getQuotaCeiling(): number {
    return this.quotaCeiling;
  }

  /**
   * Enforces 50MB storage ceiling with Tiered Pruning Policy:
   * Tier 1: Presence Chirps (lowest priority, 0x01)
   * Tier 2: Expired / regular Chat messages (priority 0x08)
   * Tier 3: Critical SOS messages (priority 0x0F / isProtected: ALWAYS PRESERVED)
   */
  public enforceQuota(): { prunedCount: number; remainingBytes: number } {
    let prunedCount = 0;
    const now = Date.now();

    // Pass 1: Prune expired messages first
    const all = this.storage.getAllMessages();
    for (const msg of all) {
      if (now >= msg.expiresAt && !msg.isProtected) {
        this.storage.deleteMessage(msg.id);
        prunedCount++;
      }
    }

    // Pass 2: If still exceeding quota, prune lowest priority (Presence Chirps)
    if (this.storage.getTotalBytes() > this.quotaCeiling) {
      const remaining = this.storage.getAllMessages().sort((a, b) => a.createdAt - b.createdAt);
      for (const msg of remaining) {
        if (this.storage.getTotalBytes() <= this.quotaCeiling) break;
        if (msg.packetType === 0x07 && !msg.isProtected) { // Presence Chirp
          this.storage.deleteMessage(msg.id);
          prunedCount++;
        }
      }
    }

    // Pass 3: If still exceeding quota, prune regular chat messages FIFO
    if (this.storage.getTotalBytes() > this.quotaCeiling) {
      const remaining = this.storage.getAllMessages().sort((a, b) => a.createdAt - b.createdAt);
      for (const msg of remaining) {
        if (this.storage.getTotalBytes() <= this.quotaCeiling) break;
        if (!msg.isProtected) {
          this.storage.deleteMessage(msg.id);
          prunedCount++;
        }
      }
    }

    return {
      prunedCount,
      remainingBytes: this.storage.getTotalBytes()
    };
  }
}
