import { describe, expect, it } from 'bun:test';
import { PacketSerializer } from '../../../src/core/protocol/PacketSerializer';
import {
  type ICompactDirectChat,
  type ICompactSOSBeacon,
  TOG_MAGIC,
  RadioCombinationCode,
  RadioCapabilityHelper
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

  it('should round-trip Presence Chirp and preserve radio capabilities', () => {
    const radioByte = RadioCapabilityHelper.packRadioByte(true, 1, RadioCombinationCode.BLE_CODED_LORA);
    const serialized = PacketSerializer.serializePresenceChirp({
      hopCount: 2,
      ourShortNodeId: 0x123456,
      batteryLevel: 4,
      isCharging: false,
      statusFlags: 0,
      ourH3Index: 0x12345678,
      radioCapabilities: radioByte,
      neighbors: []
    });

    expect(serialized.length).toBe(27);

    const deserialized = PacketSerializer.deserializePresenceChirp(serialized);
    expect(deserialized.radioCapabilities).toBe(radioByte);
    expect(deserialized.radioComboCode).toBe(RadioCombinationCode.BLE_CODED_LORA);
    expect(deserialized.isLegacyBt).toBe(false);
  });
});
