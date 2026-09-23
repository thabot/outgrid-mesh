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
  H3Direction,
  RadioCapabilityHelper,
  type ITOGHeader,
  type ITOGPacket,
  type IPresenceChirp,
  type IPresenceNeighbor,
  type ICompactSOSBeacon,
  type ICompactDirectChat,
  type IDeliveryAckPacket,
  CannedEmergencyCode,
  type ICannedEmergencyPacket,
  type IUltraCompactSOSBeacon
} from './TOGPacket';
import { CRC16 } from './CRC16';

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

    const crc = CRC16.compute(buf, 0, 19);
    view.setUint16(19, crc & 0xffff, false);

    return buf;
  }

  /**
   * Packs Neighbor Fused Byte (1 Byte):
   * Bit 0-2 (3 bits): H3 6-Direction (0-6)
   * Bit 3-5 (3 bits): Battery 5 Tiers (1-5)
   * Bit 6-7 (2 bits): RSSI 4 Levels (0-3)
   */
  public static packNeighborFusedByte(
    direction: H3Direction,
    batteryLevel: number,
    rssiTier: number
  ): number {
    const dir = Math.min(6, Math.max(0, direction)) & 0x07;
    const bat = Math.min(5, Math.max(1, batteryLevel)) & 0x07;
    const rssi = Math.min(3, Math.max(0, rssiTier)) & 0x03;
    return dir | (bat << 3) | (rssi << 6);
  }

  /**
   * Unpacks Neighbor Fused Byte (1 Byte) into { direction, batteryLevel, rssiTier }
   */
  public static unpackNeighborFusedByte(fusedByte: number): {
    direction: H3Direction;
    batteryLevel: number;
    rssiTier: number;
  } {
    const direction = (fusedByte & 0x07) as H3Direction;
    const batteryLevel = (fusedByte >> 3) & 0x07;
    const rssiTier = (fusedByte >> 6) & 0x03;
    return { direction, batteryLevel, rssiTier };
  }

  /**
   * Serializes a 27-Byte Presence Chirp Micro-Packet (0x07: PRESENCE_CHIRP)
   * Strictly formatted for BLE Legacy 31-byte limit with 4-byte Apple Find My style headroom.
   */
  public static serializePresenceChirp(
    chirp: Omit<IPresenceChirp, 'packetType' | 'crc16'>,
    trimDynamic: boolean = true
  ): Uint8Array {
    // 27 Bytes total:
    // [0] Type (5b: 0x07) | Hop (3b: 0-7) - 1B
    // [1-3] Our Short NodeID (24 bits) - 3B
    // [4] Bat 5 Tiers (3b) | Charging (1b) | Status Flags (4b) - 1B
    // [5-8] Our H3 Cell Res 9 Index (32 bits) - 4B
    // [9] Radio Capabilities (1B)
    // [10..] Dynamic Neighbors (N * 3B)
    // Dynamic Tail: CRC-16-CCITT (2B)
    const validNeighbors = (chirp.neighbors || []).filter(n => n.shortNodeId !== 0);
    const neighborCount = trimDynamic ? validNeighbors.length : Math.min(5, chirp.neighbors?.length || 0);
    const totalSlots = trimDynamic ? neighborCount : 5;
    const totalLength = 10 + (totalSlots * 3) + 2; // 12B to 27B
    const buf = new Uint8Array(totalLength);
    const view = new DataView(buf.buffer);

    // Byte 0: Type (5b) | Hop (3b)
    const pType = TOGPacketType.PRESENCE_CHIRP & 0x1f;
    const hop = (chirp.hopCount & 0x07) << 5;
    view.setUint8(0, hop | pType);

    // Byte 1-3: Our Short NodeID (24 bits, Big-Endian)
    const shortId = chirp.ourShortNodeId & 0xffffff;
    view.setUint8(1, (shortId >> 16) & 0xff);
    view.setUint8(2, (shortId >> 8) & 0xff);
    view.setUint8(3, shortId & 0xff);

    // Byte 4: Battery & Charging & Status
    const bat = Math.min(5, Math.max(1, chirp.batteryLevel)) & 0x07;
    const chg = chirp.isCharging ? 0x08 : 0x00;
    const flags = (chirp.statusFlags & 0x0f) << 4;
    view.setUint8(4, bat | chg | flags);

    // Byte 5-8: Our H3 Index (32 bits uint)
    view.setUint32(5, chirp.ourH3Index >>> 0, false);

    // Byte 9: Radio Capabilities
    view.setUint8(9, chirp.radioCapabilities & 0xff);

    // Byte 10+: Neighbors (each 3 Bytes = 2B NodeID + 1B Fused)
    for (let i = 0; i < totalSlots; i++) {
      const offset = 10 + (i * 3);
      if (i < validNeighbors.length) {
        const n = validNeighbors[i];
        view.setUint16(offset, n.shortNodeId & 0xffff, false);
        const fused = this.packNeighborFusedByte(n.direction, n.batteryLevel, n.rssiTier);
        view.setUint8(offset + 2, fused);
      } else {
        // Pad empty slots with 0 for fixed 27B legacy mode
        view.setUint16(offset, 0, false);
        view.setUint8(offset + 2, 0);
      }
    }

    // CRC-16-CCITT calculated over Bytes 0 to tail offset
    const crcOffset = 10 + (totalSlots * 3);
    const crc = CRC16.compute(buf, 0, crcOffset);
    view.setUint16(crcOffset, crc & 0xffff, false);

    return buf;
  }

  /**
   * Deserializes a Presence Chirp Micro-Packet (Dynamic 12B to 31B, Legacy 27B)
   */
  public static deserializePresenceChirp(buffer: Uint8Array): IPresenceChirp {
    if (buffer.length < 12) {
      throw new Error(`Presence Chirp buffer too short: ${buffer.length} < 12 bytes`);
    }

    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

    // Calculate dynamic neighbor count from buffer length
    const neighborBytes = buffer.length - 12; // Subtract Header 10B and CRC 2B
    const neighborSlots = Math.floor(neighborBytes / 3);
    const crcOffset = 10 + (neighborSlots * 3);

    // 1. Verify CRC-16
    const expectedCrc = view.getUint16(crcOffset, false);
    const computedCrc = CRC16.compute(buffer, 0, crcOffset);
    if (expectedCrc !== computedCrc) {
      throw new Error(`CRC-16 mismatch for Presence Chirp: 0x${expectedCrc.toString(16)} !== 0x${computedCrc.toString(16)}`);
    }

    // Byte 0: Type & Hop
    const b0 = view.getUint8(0);
    const packetType = (b0 & 0x1f) as TOGPacketType;
    const hopCount = (b0 >> 5) & 0x07;
    if (packetType !== TOGPacketType.PRESENCE_CHIRP) {
      throw new Error(`Invalid packet type for Presence Chirp: ${packetType}`);
    }

    // Byte 1-3: Our Short NodeID (24 bits)
    const ourShortNodeId = (view.getUint8(1) << 16) | (view.getUint8(2) << 8) | view.getUint8(3);

    // Byte 4: Battery & Status
    const b4 = view.getUint8(4);
    const batteryLevel = b4 & 0x07;
    const isCharging = (b4 & 0x08) !== 0;
    const statusFlags = (b4 >> 4) & 0x0f;

    // Byte 5-8: Our H3 Index
    const ourH3Index = view.getUint32(5, false);

    // Byte 9: Radio Capabilities
    const radioCapabilities = view.getUint8(9);
    const unpackedRadio = RadioCapabilityHelper.unpackRadioByte(radioCapabilities);

    // Byte 10+: Dynamic Neighbors
    const neighbors: IPresenceNeighbor[] = [];
    for (let i = 0; i < neighborSlots; i++) {
      const offset = 10 + (i * 3);
      const shortNodeId = view.getUint16(offset, false);
      const fused = view.getUint8(offset + 2);
      if (shortNodeId !== 0 || fused !== 0) {
        const { direction, batteryLevel: nBat, rssiTier } = this.unpackNeighborFusedByte(fused);
        neighbors.push({
          shortNodeId,
          direction,
          batteryLevel: nBat,
          rssiTier
        });
      }
    }

    return {
      packetType,
      hopCount,
      ourShortNodeId,
      batteryLevel,
      isCharging,
      statusFlags,
      ourH3Index,
      radioCapabilities,
      neighbors,
      crc16: expectedCrc,
      radioComboCode: unpackedRadio.comboCode,
      isLegacyBt: unpackedRadio.isLegacyBt
    };
  }

  /**
   * Serializes a Canned Emergency Status Packet (Fixed 10 Bytes)
   */
  public static serializeCannedEmergency(packet: ICannedEmergencyPacket): Uint8Array {
    const buf = new Uint8Array(10);
    const view = new DataView(buf.buffer);

    // Byte 0: Type (5b) | Hop (3b)
    const pType = (packet.packetType || TOGPacketType.SOS_BEACON) & 0x1f;
    const hop = (packet.hopCount & 0x07) << 5;
    view.setUint8(0, hop | pType);

    // Bytes 1-2: Sender ShortId
    view.setUint16(1, packet.senderShortId & 0xffff, false);
    // Bytes 3-4: Recipient ShortId (0xFFFF = Broadcast)
    view.setUint16(3, (packet.recipientShortId ?? 0xffff) & 0xffff, false);
    // Bytes 5-6: Sequence ID
    view.setUint16(5, packet.sequenceId & 0xffff, false);
    // Byte 7: Status Code
    view.setUint8(7, packet.statusCode & 0xff);

    // Bytes 8-9: CRC-16 calculated over Bytes 0 to 7
    const crc = CRC16.compute(buf, 0, 8);
    view.setUint16(8, crc & 0xffff, false);

    return buf;
  }

  /**
   * Deserializes a Canned Emergency Status Packet (Fixed 10 Bytes)
   */
  public static deserializeCannedEmergency(buffer: Uint8Array): ICannedEmergencyPacket {
    if (buffer.length < 10) {
      throw new Error(`Canned Emergency buffer too short: ${buffer.length} < 10 bytes`);
    }

    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

    // 1. Verify CRC-16
    const expectedCrc = view.getUint16(8, false);
    const computedCrc = CRC16.compute(buffer, 0, 8);
    if (expectedCrc !== computedCrc) {
      throw new Error(`CRC-16 mismatch for Canned Emergency: 0x${expectedCrc.toString(16)} !== 0x${computedCrc.toString(16)}`);
    }

    const b0 = view.getUint8(0);
    const packetType = (b0 & 0x1f) as TOGPacketType;
    const hopCount = (b0 >> 5) & 0x07;

    const senderShortId = view.getUint16(1, false);
    const recipientShortId = view.getUint16(3, false);
    const sequenceId = view.getUint16(5, false);
    const statusCode = view.getUint8(7) as CannedEmergencyCode;

    return {
      packetType,
      hopCount,
      senderShortId,
      recipientShortId,
      sequenceId,
      statusCode,
      crc16: expectedCrc
    };
  }

  /**
   * Serializes an Ultra-Compact SOS Beacon (Fixed 13 Bytes)
   */
  public static serializeUltraCompactSOS(beacon: IUltraCompactSOSBeacon): Uint8Array {
    const buf = new Uint8Array(13);
    const view = new DataView(buf.buffer);

    const pType = (beacon.packetType || TOGPacketType.SOS_BEACON) & 0x1f;
    const hop = (beacon.hopCount & 0x07) << 5;
    view.setUint8(0, hop | pType);

    view.setUint8(1, beacon.sequenceId & 0xff);
    view.setUint32(2, beacon.h3Index >>> 0, false);
    view.setInt8(6, beacon.deltaX);
    view.setInt8(7, beacon.deltaY);
    view.setUint8(8, beacon.batteryLevel & 0xff);
    view.setUint8(9, beacon.flags & 0xff);
    view.setUint8(10, beacon.reserved & 0xff);

    const crc = CRC16.compute(buf, 0, 11);
    view.setUint16(11, crc & 0xffff, false);

    return buf;
  }

  /**
   * Deserializes an Ultra-Compact SOS Beacon (Fixed 13 Bytes)
   */
  public static deserializeUltraCompactSOS(buffer: Uint8Array): IUltraCompactSOSBeacon {
    if (buffer.length < 13) {
      throw new Error(`Ultra-Compact SOS buffer too short: ${buffer.length} < 13 bytes`);
    }

    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

    const expectedCrc = view.getUint16(11, false);
    const computedCrc = CRC16.compute(buffer, 0, 11);
    if (expectedCrc !== computedCrc) {
      throw new Error(`CRC-16 mismatch for Ultra-Compact SOS: 0x${expectedCrc.toString(16)} !== 0x${computedCrc.toString(16)}`);
    }

    const b0 = view.getUint8(0);
    const packetType = (b0 & 0x1f) as TOGPacketType;
    const hopCount = (b0 >> 5) & 0x07;

    const sequenceId = view.getUint8(1);
    const h3Index = view.getUint32(2, false);
    const deltaX = view.getInt8(6);
    const deltaY = view.getInt8(7);
    const batteryLevel = view.getUint8(8);
    const flags = view.getUint8(9);
    const reserved = view.getUint8(10);

    return {
      packetType,
      hopCount,
      sequenceId,
      h3Index,
      deltaX,
      deltaY,
      batteryLevel,
      flags,
      reserved,
      crc16: expectedCrc
    };
  }

  /**
   * Serializes a Compact SOS Beacon (21 Bytes Wire Format)
   */
  public static serializeCompactSOS(beacon: ICompactSOSBeacon): Uint8Array {
    return this.serializeCompactSosBeacon(
      beacon.seqId,
      beacon.h3Index,
      beacon.deltaX,
      beacon.deltaY,
      beacon.batteryPct,
      beacon.statusFlags
    );
  }

  /**
   * Deserializes a Compact SOS Beacon (21 Bytes Wire Format)
   */
  public static deserializeCompactSOS(buffer: Uint8Array): ICompactSOSBeacon {
    if (buffer.length < 21) {
      throw new Error(`Compact SOS buffer too short: ${buffer.length} < 21 bytes`);
    }

    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

    // Verify Magic (2B)
    const magic = view.getUint16(0, false);
    if (magic !== TOG_MAGIC) {
      throw new Error(`Invalid TOG Magic for Compact SOS: 0x${magic.toString(16)}`);
    }

    // Verify CRC16 (Bytes 19-20)
    const expectedCrc = view.getUint16(19, false);
    const computedCrc = CRC16.compute(buffer, 0, 19);
    if (expectedCrc !== computedCrc) {
      throw new Error(`CRC-16 mismatch for Compact SOS: 0x${expectedCrc.toString(16)} !== 0x${computedCrc.toString(16)}`);
    }

    const seqId = view.getUint8(4);
    const h3Index = view.getBigUint64(5, false);
    const deltaX = view.getInt16(13, false);
    const deltaY = view.getInt16(15, false);
    const batteryPct = view.getUint8(17);
    const statusFlags = view.getUint8(18);

    return {
      seqId,
      h3Index,
      deltaX,
      deltaY,
      batteryPct,
      statusFlags
    };
  }

  /**
   * Serializes a Compact Direct Chat Message (<= 28 Bytes Wire Format for BT 4.2 Adv)
   * [0-1] Magic: 0x544F (2B)
   * [2] Type/Ver: 0x02 | Ver 1 (1B)
   * [3] TTL: uint8 (1B)
   * [4-5] Sender ShortId: uint16 (2B)
   * [6-7] Recipient ShortId: uint16 (2B)
   * [8-11] Truncated MsgId: uint32 (4B)
   * [12-13] H3 Lower Res9: uint16 (2B)
   * [14-27] Text Payload: UTF-8 string (up to 14B)
   */
  public static serializeCompactDirectChat(msg: ICompactDirectChat): Uint8Array {
    const encoder = new TextEncoder();
    const textBytes = encoder.encode(msg.textPayload);
    const safeTextBytes = textBytes.subarray(0, 14); // Max 14 Bytes for 28B total

    const totalLen = 14 + safeTextBytes.length;
    const buf = new Uint8Array(totalLen);
    const view = new DataView(buf.buffer);

    view.setUint16(0, TOG_MAGIC, false);
    view.setUint8(2, ((TOG_VERSION & 0x07) << 5) | (TOGPacketType.DIRECT_CHAT & 0x1f));
    view.setUint8(3, 4); // Default 4 hops for compact direct chat
    view.setUint16(4, msg.senderShortId & 0xffff, false);
    view.setUint16(6, msg.recipientShortId & 0xffff, false);
    view.setUint32(8, msg.truncatedMsgId >>> 0, false);
    view.setUint16(12, msg.h3LowerRes9 & 0xffff, false);
    buf.set(safeTextBytes, 14);

    return buf;
  }

  /**
   * Deserializes a Compact Direct Chat Message (<= 28 Bytes Wire Format)
   */
  public static deserializeCompactDirectChat(buffer: Uint8Array): ICompactDirectChat {
    if (buffer.length < 14) {
      throw new Error(`Compact Direct Chat buffer too short: ${buffer.length} < 14 bytes`);
    }

    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

    const magic = view.getUint16(0, false);
    if (magic !== TOG_MAGIC) {
      throw new Error(`Invalid TOG Magic for Compact Direct Chat: 0x${magic.toString(16)}`);
    }

    const b2 = view.getUint8(2);
    const packetType = (b2 & 0x1f) as TOGPacketType;
    if (packetType !== TOGPacketType.DIRECT_CHAT) {
      throw new Error(`Invalid packet type for Compact Direct Chat: ${packetType}`);
    }

    const senderShortId = view.getUint16(4, false);
    const recipientShortId = view.getUint16(6, false);
    const truncatedMsgId = view.getUint32(8, false);
    const h3LowerRes9 = view.getUint16(12, false);

    const textBytes = buffer.subarray(14, Math.min(buffer.length, 28));
    const decoder = new TextDecoder('utf-8');
    const textPayload = decoder.decode(textBytes);

    return {
      senderShortId,
      recipientShortId,
      truncatedMsgId,
      h3LowerRes9,
      textPayload
    };
  }

  /**
   * Serializes a Delivery Acknowledgment Packet (Fixed 10 Bytes Wire Format)
   * 0x05: DELIVERY_ACK
   * [0] Type|Hop (1B) + [1-4] MsgId (4B Uint32BE) + [5-7] RecipientId (3B Uint24BE) + [8-9] CRC16 (2B)
   */
  public static serializeDeliveryAck(ack: IDeliveryAckPacket): Uint8Array {
    const buf = new Uint8Array(10);
    const view = new DataView(buf.buffer);

    const hop = (ack.hopCount & 0x07) << 5;
    const pType = TOGPacketType.DELIVERY_ACK & 0x1f;
    view.setUint8(0, hop | pType);

    view.setUint32(1, ack.messageId >>> 0, false);

    const recipient = ack.recipientShortNodeId & 0xffffff;
    view.setUint8(5, (recipient >> 16) & 0xff);
    view.setUint8(6, (recipient >> 8) & 0xff);
    view.setUint8(7, recipient & 0xff);

    const computedCrc = CRC16.compute(buf, 0, 8);
    view.setUint16(8, computedCrc, false);

    return buf;
  }

  /**
   * Deserializes a Delivery Acknowledgment Packet (Fixed 10 Bytes Wire Format)
   */
  public static deserializeDeliveryAck(buffer: Uint8Array): IDeliveryAckPacket {
    if (buffer.length < 10) {
      throw new Error(`Delivery ACK buffer too short: ${buffer.length} < 10 bytes`);
    }

    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

    const expectedCrc = view.getUint16(8, false);
    const computedCrc = CRC16.compute(buffer, 0, 8);
    if (expectedCrc !== computedCrc) {
      throw new Error(`CRC-16 mismatch for Delivery ACK: 0x${expectedCrc.toString(16)} !== 0x${computedCrc.toString(16)}`);
    }

    const b0 = view.getUint8(0);
    const packetType = (b0 & 0x1f) as TOGPacketType;
    if (packetType !== TOGPacketType.DELIVERY_ACK) {
      throw new Error(`Invalid packet type for Delivery ACK: ${packetType}`);
    }
    const hopCount = (b0 >> 5) & 0x07;

    const messageId = view.getUint32(1, false);

    const r0 = view.getUint8(5);
    const r1 = view.getUint8(6);
    const r2 = view.getUint8(7);
    const recipientShortNodeId = (r0 << 16) | (r1 << 8) | r2;

    return {
      packetType,
      hopCount,
      messageId,
      recipientShortNodeId,
      crc16: expectedCrc
    };
  }
}

