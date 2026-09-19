/**
 * Thabot OutGrid Protocol (TOG v1.1) Wire Specification & Frame Types
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Wire Format
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export const TOG_MAGIC = 0x544F; // ASCII 'TO' (Thabot OutGrid)
export const TOG_VERSION = 1;

export enum TOGPacketType {
  SOS_BEACON = 0x01,
  DIRECT_CHAT = 0x02,
  GROUP_CHAT = 0x03,
  CRISIS_FEED = 0x04,
  DELIVERY_ACK = 0x05,
  DELIVERY_NACK = 0x06,
  PRESENCE_CHIRP = 0x07
}

export enum TOGPriority {
  LOW = 0x0,
  NORMAL = 0x1,
  HIGH = 0x2,
  CRITICAL_SOS = 0x3
}

/**
 * Standard Default Hop Limits (TTL) by packet classification
 * Optimized for disaster resilience & flood reach while maintaining power efficiency
 */
export const DEFAULT_SOS_HOPS = 25;         // Max penetration for life-critical SOS (~1.5 - 2.5km BLE)
export const DEFAULT_ACK_HOPS = 25;         // Symmetric return path for delivery acknowledgment
export const DEFAULT_CRISIS_FEED_HOPS = 20; // Official disaster alerts & evacuation notices
export const DEFAULT_CHAT_HOPS = 8;         // Standard direct/group communications
export const DEFAULT_PRESENCE_HOPS = 2;     // Neighbor discovery link-local scope

export interface ITOGHeader {
  magic: number;             // 16 bits (0x544F)
  version: number;           // 3 bits (0b001)
  packetType: TOGPacketType; // 5 bits (0x01 - 0x07)
  ttlHops: number;           // 8 bits (0 - 255)
  priority: TOGPriority;     // 4 bits (0x0 - 0xF)
  flags: number;             // 3 bits (0b000 - 0b111)
  reserved: number;          // 3 bits (0b000)
}

export interface ITOGPacket {
  header: ITOGHeader;
  messageId: bigint;           // 64-bit uint (8 Bytes)
  senderPubkeyHash: Uint8Array; // 8 Bytes (truncated SHA-256)
  recipientHash: Uint8Array;    // 8 Bytes (recipient / topic hash)
  targetH3Index: bigint;        // 64-bit uint (8 Bytes)
  payloadLength: number;        // 16-bit uint (2 Bytes)
  payload: Uint8Array;          // Variable payload data
}

/**
 * H3 Local Delta Offset (4 Bytes)
 * High-precision GPS delta relative to Target H3 Hexagon center (< 1m precision)
 */
export interface IH3LocalDeltaOffset {
  deltaX: number; // int16 (-1500m to +1500m)
  deltaY: number; // int16 (-1500m to +1500m)
}
