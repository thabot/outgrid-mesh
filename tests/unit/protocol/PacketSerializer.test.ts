/**
 * Unit tests for PacketSerializer (TOG v1.1 Wire Format)
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, expect, it } from 'bun:test';
import { PacketSerializer } from '../../../src/core/protocol/PacketSerializer';
import {
  TOG_MAGIC,
  TOGPacketType,
  TOGPriority,
  type ITOGPacket
} from '../../../src/core/protocol/TOGPacket';

describe('PacketSerializer (TOG v1.1 Wire Format)', () => {
  it('should correctly serialize and deserialize a standard TOG packet', () => {
    const originalPacket: ITOGPacket = {
      header: {
        magic: TOG_MAGIC,
        version: 1,
        packetType: TOGPacketType.DIRECT_CHAT,
        ttlHops: 5,
        priority: TOGPriority.NORMAL,
        flags: 0b001, // encrypted
        reserved: 0
      },
      messageId: 1234567890123456789n,
      senderPubkeyHash: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
      recipientHash: new Uint8Array([8, 7, 6, 5, 4, 3, 2, 1]),
      targetH3Index: 0x88654c5525fffff0n,
      payloadLength: 14,
      payload: new TextEncoder().encode('Hello OutGrid!')
    };

    const serialized = PacketSerializer.serialize(originalPacket);
    expect(serialized).toBeInstanceOf(Uint8Array);
    expect(serialized.length).toBe(39 + 14);

    const deserialized = PacketSerializer.deserialize(serialized);

    expect(deserialized.header.magic).toBe(TOG_MAGIC);
    expect(deserialized.header.version).toBe(1);
    expect(deserialized.header.packetType).toBe(TOGPacketType.DIRECT_CHAT);
    expect(deserialized.header.ttlHops).toBe(5);
    expect(deserialized.header.priority).toBe(TOGPriority.NORMAL);
    expect(deserialized.messageId).toBe(1234567890123456789n);
    expect(deserialized.targetH3Index).toBe(0x88654c5525fffff0n);
    expect(deserialized.payloadLength).toBe(14);
    expect(new TextDecoder().decode(deserialized.payload)).toBe('Hello OutGrid!');
    expect(Array.from(deserialized.senderPubkeyHash)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(Array.from(deserialized.recipientHash)).toEqual([8, 7, 6, 5, 4, 3, 2, 1]);
  });

  it('should throw error when magic word does not match TOG_MAGIC', () => {
    const invalidBuffer = new Uint8Array(50);
    invalidBuffer[0] = 0x12;
    invalidBuffer[1] = 0x34;

    expect(() => PacketSerializer.deserialize(invalidBuffer)).toThrow('Invalid TOG Magic');
  });

  it('should correctly produce compact 21-byte SOS Emergency Beacon', () => {
    const compactSos = PacketSerializer.serializeCompactSosBeacon(
      42,
      0x88654c5525fffff0n,
      -120, // 120m West
      350,  // 350m North
      85,   // 85% battery
      0x05  // Trapped + Child
    );

    expect(compactSos.length).toBe(21); // Strict 21 Bytes specification

    const view = new DataView(compactSos.buffer);
    expect(view.getUint16(0, false)).toBe(TOG_MAGIC);
    expect((view.getUint8(2) & 0x1f)).toBe(TOGPacketType.SOS_BEACON);
    expect(view.getUint8(4)).toBe(42);
    expect(view.getBigUint64(5, false)).toBe(0x88654c5525fffff0n);
    expect(view.getInt16(13, false)).toBe(-120);
    expect(view.getInt16(15, false)).toBe(350);
    expect(view.getUint8(17)).toBe(85);
    expect(view.getUint8(18)).toBe(0x05);
  });
});
