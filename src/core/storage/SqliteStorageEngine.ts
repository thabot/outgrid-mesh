/**
 * SQLite & Local Storage Engine with 50MB FIFO Ceiling
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import {
  type IStoredMessage,
  type IStoredContact,
  type ISpatialCacheTile,
  MAX_STORAGE_BYTES
} from './schema';

export class SqliteStorageEngine {
  private messages: Map<string, IStoredMessage> = new Map();
  private contacts: Map<string, IStoredContact> = new Map();
  private spatialCache: Map<string, ISpatialCacheTile> = new Map();
  private totalPayloadBytes: number = 0;
  private maxCapacityBytes: number = MAX_STORAGE_BYTES;

  constructor(maxBytes = MAX_STORAGE_BYTES) {
    this.maxCapacityBytes = maxBytes;
  }

  /**
   * Inserts or updates a message into storage
   * Performs FIFO eviction if storage ceiling is reached (protecting SOS)
   */
  public saveMessage(message: IStoredMessage): void {
    const existing = this.messages.get(message.id);
    if (existing) {
      this.totalPayloadBytes -= existing.payloadSize;
    }

    // Ensure capacity by evicting oldest non-protected messages
    this.ensureCapacity(message.payloadSize);

    this.messages.set(message.id, message);
    this.totalPayloadBytes += message.payloadSize;
  }

  /**
   * Retrieves a message by ID
   */
  public getMessage(id: string): IStoredMessage | undefined {
    return this.messages.get(id);
  }

  /**
   * Retrieves all messages ordered by creation time (FIFO)
   */
  public getAllMessages(): IStoredMessage[] {
    return Array.from(this.messages.values()).sort((a, b) => a.createdAt - b.createdAt);
  }

  /**
   * Deletes a message by ID
   */
  public deleteMessage(id: string): boolean {
    const msg = this.messages.get(id);
    if (!msg) return false;
    this.totalPayloadBytes -= msg.payloadSize;
    return this.messages.delete(id);
  }

  /**
   * Updates delivery status (e.g. marked delivered upon receiving reverse ACK)
   */
  public updateDeliveryStatus(id: string, status: 'pending' | 'delivered' | 'failed'): boolean {
    const msg = this.messages.get(id);
    if (!msg) return false;
    msg.deliveryStatus = status;
    msg.isDelivered = status === 'delivered';
    return true;
  }

  /**
   * Evicts oldest messages when approaching memory quota
   * NEVER evicts protected messages (SOS Beacons)
   */
  private ensureCapacity(incomingBytes: number): void {
    while (this.totalPayloadBytes + incomingBytes > this.maxCapacityBytes) {
      // Find oldest non-protected message
      let oldestKey: string | null = null;
      let oldestTime = Infinity;

      for (const [key, msg] of this.messages.entries()) {
        if (!msg.isProtected && msg.createdAt < oldestTime) {
          oldestTime = msg.createdAt;
          oldestKey = key;
        }
      }

      if (!oldestKey) {
        // Only protected messages remain; break to prevent deleting critical SOS
        break;
      }

      const evicted = this.messages.get(oldestKey);
      if (evicted) {
        this.totalPayloadBytes -= evicted.payloadSize;
        this.messages.delete(oldestKey);
      }
    }
  }

  /**
   * Saves or updates a verified contact
   */
  public saveContact(contact: IStoredContact): void {
    this.contacts.set(contact.pubkeyHash, contact);
  }

  /**
   * Retrieves a contact by public key hash
   */
  public getContact(pubkeyHash: string): IStoredContact | undefined {
    return this.contacts.get(pubkeyHash);
  }

  /**
   * Saves a spatial map tile into cache
   */
  public saveTile(tile: ISpatialCacheTile): void {
    this.spatialCache.set(tile.tileId, tile);
  }

  /**
   * Retrieves a cached spatial map tile
   */
  public getTile(tileId: string): ISpatialCacheTile | undefined {
    const tile = this.spatialCache.get(tileId);
    if (tile) {
      tile.lastAccessedAt = Date.now();
    }
    return tile;
  }

  public getTotalBytes(): number {
    return this.totalPayloadBytes;
  }

  public getMessageCount(): number {
    return this.messages.size;
  }

  public clear(): void {
    this.messages.clear();
    this.contacts.clear();
    this.spatialCache.clear();
    this.totalPayloadBytes = 0;
  }
}
