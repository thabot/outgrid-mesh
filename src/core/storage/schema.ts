/**
 * Local Storage Schema Definition (SQLite / IndexedDB)
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Storage Layer
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export const MAX_STORAGE_BYTES = 50 * 1024 * 1024; // Strict 50MB FIFO Ceiling

export interface IStoredMessage {
  id: string;              // Hex string of 64-bit uint messageId
  packetType: number;      // 0x01 SOS, 0x02 Chat, etc.
  priority: number;        // 0xF (SOS), 0x8 (Chat), 0x1 (Presence)
  senderHash: string;      // Hex string of 8-byte sender hash
  recipientHash: string;   // Hex string of 8-byte recipient hash
  targetH3Index: string;   // Hex string of 64-bit H3 index
  payload: Uint8Array;     // Ciphertext or plain SOS payload
  payloadSize: number;     // Size in bytes
  createdAt: number;       // Timestamp (ms)
  expiresAt: number;       // Expiry timestamp (ms)
  isDelivered: boolean;    // Delivery status (true = ACK received)
  deliveryStatus: 'pending' | 'delivered' | 'failed';
  isProtected: boolean;    // Protected from FIFO eviction (true for SOS)
}

export interface IStoredContact {
  pubkeyHash: string;      // 8-byte hash
  fullPubkeyHex: string;   // 32-byte hex string
  alias: string;           // Custom name given by user
  isVerified: boolean;     // Verified via In-Person QR Code
  lastSeenAt: number;
}

export interface ISpatialCacheTile {
  tileId: string;          // H3 Index or Vector Tile ID
  tileData: Uint8Array;
  sizeBytes: number;
  lastAccessedAt: number;
}
