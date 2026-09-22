import { describe, expect, it } from 'bun:test';
import { PacketSerializer } from '../../../src/core/protocol/PacketSerializer';
import {
  type ICompactDirectChat,
  type ICompactSOSBeacon,
  TOG_MAGIC,
  RadioCombinationCode,
  RadioCapabilityHelper,
  TOGPacketType,
  CannedEmergencyCode
} from '../../../src/core/protocol/TOGPacket';

describe('Phase 1 - Task 1.2: Compact Serializers & Deserializers', () => {
  it('should correctly serialize and deserialize Compact Direct Chat (<= 28B)', () => {
    const chatMsg: ICompactDirectChat = {
      senderShortId: 0x1234,
      recipientShortId: 0x5678,
      truncatedMsgId: 0xDEADBEEF,
      h3LowerRes9: 0xABCD,
      textPayload: 'Hello Mesh!'
    };

    const bytes = PacketSerializer.serializeCompactDirectChat(chatMsg);
    expect(bytes.length).toBeLessThanOrEqual(28);
    expect(bytes.length).toBe(14 + (new TextEncoder().encode(chatMsg.textPayload)).length);

    const deserialized = PacketSerializer.deserializeCompactDirectChat(bytes);
    expect(deserialized.senderShortId).toBe(chatMsg.senderShortId);
    expect(deserialized.recipientShortId).toBe(chatMsg.recipientShortId);
    expect(deserialized.truncatedMsgId).toBe(chatMsg.truncatedMsgId);
    expect(deserialized.h3LowerRes9).toBe(chatMsg.h3LowerRes9);
    expect(deserialized.textPayload).toBe(chatMsg.textPayload);
  });

  it('should safely truncate Compact Direct Chat text if longer than 14 bytes', () => {
    const longMsg: ICompactDirectChat = {
      senderShortId: 1,
      recipientShortId: 2,
      truncatedMsgId: 100,
      h3LowerRes9: 200,
      textPayload: 'This text is definitely way longer than 14 bytes limit'
    };

    const bytes = PacketSerializer.serializeCompactDirectChat(longMsg);
    expect(bytes.length).toBe(28); // 14B header + 14B max text

    const deserialized = PacketSerializer.deserializeCompactDirectChat(bytes);
    expect(deserialized.textPayload.length).toBeLessThanOrEqual(14);
  });

  it('should serialize and deserialize Compact SOS Beacon (21 Bytes exactly)', () => {
    const sos: ICompactSOSBeacon = {
      seqId: 42,
      h3Index: 0x8928308280fffff0n,
      deltaX: -150,
      deltaY: 300,
      batteryPct: 85,
      statusFlags: 0x05 // Trapped + Medical
    };

    const bytes = PacketSerializer.serializeCompactSOS(sos);
    expect(bytes.length).toBe(21);

    const deserialized = PacketSerializer.deserializeCompactSOS(bytes);
    expect(deserialized.seqId).toBe(sos.seqId);
    expect(deserialized.h3Index).toBe(sos.h3Index);
    expect(deserialized.deltaX).toBe(sos.deltaX);
    expect(deserialized.deltaY).toBe(sos.deltaY);
    expect(deserialized.batteryPct).toBe(sos.batteryPct);
    expect(deserialized.statusFlags).toBe(sos.statusFlags);
  });

  it('should serialize and deserialize Canned Emergency Status in exactly 10 Bytes', () => {
    const packet = {
      packetType: TOGPacketType.SOS_BEACON,
      hopCount: 5,
      senderShortId: 0x4A12,
      recipientShortId: 0xFFFF,
      sequenceId: 1024,
      statusCode: CannedEmergencyCode.TRAPPED,
      crc16: 0
    };

    const serialized = PacketSerializer.serializeCannedEmergency(packet);
    expect(serialized.length).toBe(10);

    const deserialized = PacketSerializer.deserializeCannedEmergency(serialized);
    expect(deserialized.packetType).toBe(TOGPacketType.SOS_BEACON);
    expect(deserialized.hopCount).toBe(5);
    expect(deserialized.senderShortId).toBe(0x4A12);
    expect(deserialized.recipientShortId).toBe(0xFFFF);
    expect(deserialized.sequenceId).toBe(1024);
    expect(deserialized.statusCode).toBe(CannedEmergencyCode.TRAPPED);
    expect(deserialized.crc16).toBeGreaterThan(0);
  });

  it('should throw error when Canned Emergency packet is corrupted or truncated', () => {
    const packet = {
      packetType: TOGPacketType.SOS_BEACON,
      hopCount: 3,
      senderShortId: 0x1234,
      recipientShortId: 0x5678,
      sequenceId: 1,
      statusCode: CannedEmergencyCode.NEED_MEDIC,
      crc16: 0
    };
    const serialized = PacketSerializer.serializeCannedEmergency(packet);

    // Corrupt byte 7 (status code)
    const corrupted = new Uint8Array(serialized);
    corrupted[7] = CannedEmergencyCode.FLOOD_DANGER;
    expect(() => PacketSerializer.deserializeCannedEmergency(corrupted)).toThrow(/CRC/);

    // Buffer truncated < 10B
    expect(() => PacketSerializer.deserializeCannedEmergency(serialized.subarray(0, 9))).toThrow(/too short/);
  });

  it('should dynamically trim Presence Chirp to 15B (1 neighbor), 18B (2 neighbors), and 21B (3 neighbors)', () => {
    const chirpBase = {
      packetType: TOGPacketType.PRESENCE_CHIRP,
      hopCount: 3,
      ourShortNodeId: 0x112233,
      batteryLevel: 4,
      isCharging: true,
      statusFlags: 0x01,
      ourH3Index: 0x89283082,
      radioCapabilities: 0x28,
      neighbors: [{ shortNodeId: 0xAAAA, direction: 1, batteryLevel: 5, rssiTier: 3 }],
      crc16: 0
    };

    // 1 Neighbor -> 10B Header + 3B Neighbor + 2B CRC = 15B
    const buf1 = PacketSerializer.serializePresenceChirp(chirpBase, true);
    expect(buf1.length).toBe(15);
    const dec1 = PacketSerializer.deserializePresenceChirp(buf1);
    expect(dec1.neighbors.length).toBe(1);
    expect(dec1.neighbors[0].shortNodeId).toBe(0xAAAA);

    // 2 Neighbors -> 10B Header + 6B Neighbors + 2B CRC = 18B
    chirpBase.neighbors.push({ shortNodeId: 0xBBBB, direction: 4, batteryLevel: 3, rssiTier: 2 });
    const buf2 = PacketSerializer.serializePresenceChirp(chirpBase, true);
    expect(buf2.length).toBe(18);
    const dec2 = PacketSerializer.deserializePresenceChirp(buf2);
    expect(dec2.neighbors.length).toBe(2);
    expect(dec2.neighbors[1].shortNodeId).toBe(0xBBBB);

    // 3 Neighbors -> 10B Header + 9B Neighbors + 2B CRC = 21B
    chirpBase.neighbors.push({ shortNodeId: 0xCCCC, direction: 6, batteryLevel: 2, rssiTier: 1 });
    const buf3 = PacketSerializer.serializePresenceChirp(chirpBase, true);
    expect(buf3.length).toBe(21);
    const dec3 = PacketSerializer.deserializePresenceChirp(buf3);
    expect(dec3.neighbors.length).toBe(3);
    expect(dec3.neighbors[2].shortNodeId).toBe(0xCCCC);
  });

  it('should maintain 100% backward compatibility when deserializing legacy 27B Presence Chirps', () => {
    const legacyChirp = {
      hopCount: 2,
      ourShortNodeId: 0x998877,
      batteryLevel: 5,
      isCharging: false,
      statusFlags: 0,
      ourH3Index: 0x88283082,
      radioCapabilities: 0x08,
      neighbors: [
        { shortNodeId: 0x1111, direction: 2, batteryLevel: 4, rssiTier: 3 },
        { shortNodeId: 0x2222, direction: 3, batteryLevel: 3, rssiTier: 2 },
        { shortNodeId: 0x3333, direction: 5, batteryLevel: 2, rssiTier: 1 },
        { shortNodeId: 0x4444, direction: 1, batteryLevel: 5, rssiTier: 3 },
        { shortNodeId: 0x5555, direction: 6, batteryLevel: 1, rssiTier: 0 }
      ],
      crc16: 0
    };

    const legacyBuf = PacketSerializer.serializePresenceChirp(legacyChirp, false);
    expect(legacyBuf.length).toBe(27);
    const parsed = PacketSerializer.deserializePresenceChirp(legacyBuf);
    expect(parsed.neighbors.length).toBe(5);
    expect(parsed.ourShortNodeId).toBe(0x998877);
  });

  it('should serialize and deserialize Ultra-Compact SOS Beacon in exactly 13 Bytes', () => {
    const beacon = {
      packetType: TOGPacketType.SOS_BEACON,
      hopCount: 7,
      sequenceId: 42,
      h3Index: 0x88283082,
      deltaX: -15,
      deltaY: 28,
      batteryLevel: 85,
      flags: 0x01,
      reserved: 0x00,
      crc16: 0
    };

    const serialized = PacketSerializer.serializeUltraCompactSOS(beacon);
    expect(serialized.length).toBe(13);

    const deserialized = PacketSerializer.deserializeUltraCompactSOS(serialized);
    expect(deserialized.packetType).toBe(TOGPacketType.SOS_BEACON);
    expect(deserialized.hopCount).toBe(7);
    expect(deserialized.sequenceId).toBe(42);
    expect(deserialized.h3Index).toBe(0x88283082);
    expect(deserialized.deltaX).toBe(-15);
    expect(deserialized.deltaY).toBe(28);
    expect(deserialized.batteryLevel).toBe(85);
    expect(deserialized.flags).toBe(0x01);
    expect(deserialized.crc16).toBeGreaterThan(0);
  });
});
