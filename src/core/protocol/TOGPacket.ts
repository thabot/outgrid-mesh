/**
 * Thabot OutGrid Protocol (TOG v1.1) Wire Specification
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
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
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL_SOS = 3
}

export interface ITOGHeader {
  magic: number;        // 16 bits (0x544F)
  version: number;      // 3 bits
  packetType: TOGPacketType; // 5 bits
  ttlHops: number;      // 8 bits
  priority: TOGPriority; // 2 bits
  flags: number;        // 3 bits (compressed, encrypted, multipart)
  reserved: number;     // 3 bits
}

export interface ITOGPacket {
  header: ITOGHeader;
  messageId: bigint;           // 64-bit uint
  senderPubkeyHash: Uint8Array; // 8 bytes
  recipientHash: Uint8Array;    // 8 bytes (or Topic hash)
  targetH3Index: bigint;        // 64-bit uint (Uber H3 Index)
  payloadLength: number;        // 16-bit uint
  payload: Uint8Array;
}
