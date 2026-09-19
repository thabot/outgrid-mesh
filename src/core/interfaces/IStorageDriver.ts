/**
 * Hexagonal Port: Storage Driver Interface
 * Protocol: TOG v1.1 Pure Domain Port
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export interface IStoredMessage {
  id: string;
  type: number;
  senderHash: string;
  recipientHash: string;
  payload: Uint8Array;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';
  timestamp: number;
  ttl: number;
  hops: number;
  isEmergency: boolean;
}

export interface IPeerContact {
  pubkeyHash: string;
  ed25519Pubkey: string;
  x25519Pubkey: string;
  nickname: string;
  lastSeen: number;
  batteryLevel: number;
  h3Index: string;
  isSupernode: boolean;
  safetyNumbers: string;
}

export interface IStorageDriver {
  /** Driver identifier (e.g., 'SQLITE_NATIVE', 'INDEXED_DB', 'IN_MEMORY_MOCK') */
  readonly driverName: string;

  /** Initialize tables, indices, and encryption envelope */
  initialize(): Promise<void>;

  /** Insert or update a message in storage */
  saveMessage(msg: IStoredMessage): Promise<void>;

  /** Retrieve a message by ID */
  getMessage(id: string): Promise<IStoredMessage | null>;

  /** Query messages for a given contact or emergency channel */
  getMessages(recipientHash?: string, limit?: number): Promise<IStoredMessage[]>;

  /** Insert or update contact information */
  savePeer(peer: IPeerContact): Promise<void>;

  /** Retrieve contact by public key hash */
  getPeer(pubkeyHash: string): Promise<IPeerContact | null>;

  /** List all known contacts */
  getAllPeers(): Promise<IPeerContact[]>;

  /** Enforce 50MB FIFO Quota with Emergency Immunity */
  enforceQuota(maxSizeBytes?: number): Promise<{ evictedCount: number; currentBytes: number }>;

  /** Check current storage footprint in bytes */
  getStorageUsageBytes(): Promise<number>;

  /** Close and flush database connections */
  close(): Promise<void>;
}
