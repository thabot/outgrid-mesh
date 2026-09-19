/**
 * Thabot OutGrid Protocol (TOG v1.1) Packet Serializer & Deserializer
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Wire Format
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import {
  TOG_MAGIC,
  TOG_VERSION,
  TOGPacketType,
  TOGPriority,
  type ITOGHeader,
  type ITOGPacket
} from './TOGPacket';

export const HEADER_SIZE = 4; // Magic (2B) + Ver/Type/TTL (2B) + Priority/Flags/Reserved
// Actually according to TOG v1.1 specification:
// Byte 0-1: Magic (16 bits)
// Byte 2: Version (3 bits) | PacketType (5 bits)
// Byte 3: TTL/Hops (8 bits)
// Byte 4: Priority (4 bits) | Flags (3 bits) | Reserved (1 bit) or similar
// Let's verify exact byte layout:
// Total standard fixed header before payload:
// Magic (2B) + Ver/Type (1B) + TTL (1B) + Priority/Flags (1B) = 5B (or 4B header word)
// In specification Section 2.1:
// 0                   1                   2                   3
// 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
// +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
// | Magic (0x544F)|Ver| Type  |TTL/Hop| Priority |Flags| Reserved | (4 Bytes) - wait: 16b + 3b + 5b + 8b = 32 bits (4 Bytes).
// Next word: Priority (4 bits) | Flags (3 bits) | Reserved (1 bit) or Priority/Flags/Reserved inside 1 Byte.
// In Section 1.2: "TOG v1.1 Header 5B (SOS 21B, ACK 10B ใน 1 Beacon)"
// Fixed fields:
// 1. Magic (2 Bytes) = 0x544F
// 2. Ver (3b) + Type (5b) = 1 Byte
// 3. TTL (8b) = 1 Byte
// 4. Priority (4b) + Flags (3b) + Reserved (1b) = 1 Byte
// Total Header = 5 Bytes.
// Next fields:
// Message ID (8 Bytes)
// Sender PubKey Hash (8 Bytes)
// Recipient Hash (8 Bytes)
// Target H3 Index (8 Bytes)
// Payload Length (2 Bytes)
// Payload Data (Variable)
export const TOG_HEADER_SIZE = 5;
export const TOG_FIXED_METADATA_SIZE = TOG_HEADER_SIZE + 8 + 8 + 8 + 8 + 2; // 39 Bytes

export class PacketSerializer {
  /**
   * Serializes an ITOGPacket into raw Uint8Array according to TOG v1.1 Wire Specification
   */
  public static serialize(packet: ITOGPacket): Uint8Array {
    const payloadLen = packet.payload.length;
    const totalSize = TOG_FIXED_METADATA_SIZE + payloadLen;
    const buffer = new Uint8Array(totalSize);
    const view = new DataView(buffer.buffer);

    // 1. Magic (16 bits, Big-Endian)
    view.setUint16(0, packet.header.magic || TOG_MAGIC, false);

    // 2. Version (3 bits) | PacketType (5 bits)
    const ver = (packet.header.version & 0x07) << 5;
    const pType = packet.header.packetType & 0x1f;
    view.setUint8(2, ver | pType);

    // 3. TTL / Hop Count (8 bits)
    view.setUint8(3, packet.header.ttlHops & 0xff);

    // 4. Priority (4 bits) | Flags (3 bits) | Reserved (1 bit)
    const prio = (packet.header.priority & 0x0f) << 4;
    const flags = (packet.header.flags & 0x07) << 1;
    const reserved = (packet.header.reserved || 0) & 0x01;
    view.setUint8(4, prio | flags | reserved);

    // 5. Message ID (64 bits, Big-Endian)
    view.setBigUint64(5, packet.messageId, false);

    // 6. Sender Pubkey Hash (8 Bytes)
    if (packet.senderPubkeyHash.length < 8) {
      buffer.set(packet.senderPubkeyHash, 13);
    } else {
      buffer.set(packet.senderPubkeyHash.subarray(0, 8), 13);
    }

    // 7. Recipient Hash (8 Bytes)
    if (packet.recipientHash.length < 8) {
      buffer.set(packet.recipientHash, 21);
    } else {
      buffer.set(packet.recipientHash.subarray(0, 8), 21);
    }

    // 8. Target H3 Index (64 bits, Big-Endian)
    view.setBigUint64(29, packet.targetH3Index, false);

    // 9. Payload Length (16 bits, Big-Endian)
    view.setUint16(37, payloadLen, false);

    // 10. Payload Data
    if (payloadLen > 0) {
      buffer.set(packet.payload, 39);
    }

    return buffer;
  }

  /**
   * Deserializes raw Uint8Array into an ITOGPacket
   */
  public static deserialize(buffer: Uint8Array): ITOGPacket {
    if (buffer.length < TOG_FIXED_METADATA_SIZE) {
      throw new Error(`Packet buffer too short: ${buffer.length} < ${TOG_FIXED_METADATA_SIZE}`);
    }

    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

    // 1. Magic check
    const magic = view.getUint16(0, false);
    if (magic !== TOG_MAGIC) {
      throw new Error(`Invalid TOG Magic: 0x${magic.toString(16).toUpperCase()}, expected 0x${TOG_MAGIC.toString(16)}`);
    }

    // 2. Version & Type
    const b2 = view.getUint8(2);
    const version = (b2 >> 5) & 0x07;
    const packetType = (b2 & 0x1f) as TOGPacketType;

    // 3. TTL
    const ttlHops = view.getUint8(3);

    // 4. Priority, Flags, Reserved
    const b4 = view.getUint8(4);
    const priority = ((b4 >> 4) & 0x0f) as TOGPriority;
    const flags = (b4 >> 1) & 0x07;
    const reserved = b4 & 0x01;

    // 5. Message ID
    const messageId = view.getBigUint64(5, false);

    // 6. Sender Pubkey Hash (8 Bytes)
    const senderPubkeyHash = new Uint8Array(buffer.subarray(13, 21));

    // 7. Recipient Hash (8 Bytes)
    const recipientHash = new Uint8Array(buffer.subarray(21, 29));

    // 8. Target H3 Index
    const targetH3Index = view.getBigUint64(29, false);

    // 9. Payload Length
    const payloadLength = view.getUint16(37, false);

    // 10. Payload Data
    const payload = new Uint8Array(buffer.subarray(39, 39 + payloadLength));

    const header: ITOGHeader = {
      magic,
      version,
      packetType,
      ttlHops,
      priority,
      flags,
      reserved
    };

    return {
      header,
      messageId,
      senderPubkeyHash,
      recipientHash,
      targetH3Index,
      payloadLength,
      payload
    };
  }

  /**
   * Creates a compact 21-byte SOS Emergency Beacon payload frame
   * for BLE Advertising (Legacy 31-byte limit compatible)
   */
  public static serializeCompactSosBeacon(
    seqId: number,
    h3Index: bigint,
    deltaX: number,
    deltaY: number,
    batteryPct: number,
    statusFlags: number
  ): Uint8Array {
    // Compact SOS Beacon layout (21 Bytes total):
    // [0-1] Magic (0x544F) - 2B
    // [2] Type (0x01 SOS) + Ver (1) - 1B
    // [3] TTL / Hop (1B)
    // [4] SeqId (uint8, 1B)
    // [5-12] H3 Index Res 9 (uint64, 8B)
    // [13-14] Delta X (int16, 2B)
    // [15-16] Delta Y (int16, 2B)
    // [17] Battery Pct (0-100, 1B)
    // [18] Status Flags (e.g. Trapped/Medic/Child, 1B)
    // [19-20] CRC16 / Checksum (2B)
    const buf = new Uint8Array(21);
    const view = new DataView(buf.buffer);

    view.setUint16(0, TOG_MAGIC, false);
    view.setUint8(2, ((TOG_VERSION & 0x07) << 5) | (TOGPacketType.SOS_BEACON & 0x1f));
    view.setUint8(3, 7); // Default 7 hops for SOS
    view.setUint8(4, seqId & 0xff);
    view.setBigUint64(5, h3Index, false);
    view.setInt16(13, deltaX, false);
    view.setInt16(15, deltaY, false);
    view.setUint8(17, Math.min(100, Math.max(0, batteryPct)));
    view.setUint8(18, statusFlags & 0xff);

    // Simple CRC16-CCITT for compact 21B validation
    let crc = 0xffff;
    for (let i = 0; i < 19; i++) {
      crc ^= buf[i] << 8;
      for (let j = 0; j < 8; j++) {
        crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      }
    }
    view.setUint16(19, crc & 0xffff, false);

    return buf;
  }
}
