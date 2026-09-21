/**
 * Unit tests for TOG v1.1 27-Byte Presence Chirp Wire Format
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, expect, it } from 'bun:test';
import { PacketSerializer } from '../../../src/core/protocol/PacketSerializer';
import {
  TOGPacketType,
  H3Direction,
  RadioCapabilitiesBitmask,
  type IPresenceNeighbor
} from '../../../src/core/protocol/TOGPacket';
import { CRC16 } from '../../../src/core/protocol/CRC16';

describe('TOG v1.1 27-Byte Presence Chirp Micro-Packet', () => {
  it('should serialize to exactly 27 bytes and deserialize back with 100% fidelity', () => {
    const neighbors: IPresenceNeighbor[] = [
      { shortNodeId: 0x1234, direction: H3Direction.NORTH, batteryLevel: 4, rssiTier: 3 },
      { shortNodeId: 0x5678, direction: H3Direction.NORTH_EAST, batteryLevel: 3, rssiTier: 2 },
      { shortNodeId: 0x9abc, direction: H3Direction.SOUTH_EAST, batteryLevel: 5, rssiTier: 1 },
      { shortNodeId: 0xdef0, direction: H3Direction.SOUTH, batteryLevel: 2, rssiTier: 0 },
      { shortNodeId: 0x1357, direction: H3Direction.SOUTH_WEST, batteryLevel: 1, rssiTier: 3 }
    ];

    const chirpInput = {
      hopCount: 2,
      ourShortNodeId: 0xabcdef, // 24-bit integer
      batteryLevel: 5,         // 5 bars (100%)
      isCharging: true,        // plugged in
      statusFlags: 0x01,       // status flag
      ourH3Index: 0x89283082,  // 32-bit cell index
      radioCapabilities: RadioCapabilitiesBitmask.BLE_ACTIVE | RadioCapabilitiesBitmask.LORA_BRIDGE_ACTIVE | RadioCapabilitiesBitmask.STATIONARY_NODE,
      neighbors
    };

    const rawBuffer = PacketSerializer.serializePresenceChirp(chirpInput);

    // 1. Strict Size Check: Must be exactly 27 Bytes
    expect(rawBuffer).toBeInstanceOf(Uint8Array);
    expect(rawBuffer.length).toBe(27);

    // 2. Deserialization & Integrity Verification
    const decoded = PacketSerializer.deserializePresenceChirp(rawBuffer);

    expect(decoded.packetType).toBe(TOGPacketType.PRESENCE_CHIRP);
    expect(decoded.hopCount).toBe(2);
    expect(decoded.ourShortNodeId).toBe(0xabcdef);
    expect(decoded.batteryLevel).toBe(5);
    expect(decoded.isCharging).toBe(true);
    expect(decoded.ourH3Index).toBe(0x89283082);
    expect(decoded.radioCapabilities).toBe(
      RadioCapabilitiesBitmask.BLE_ACTIVE | RadioCapabilitiesBitmask.LORA_BRIDGE_ACTIVE | RadioCapabilitiesBitmask.STATIONARY_NODE
    );

    // Verify 5 neighbors
    expect(decoded.neighbors.length).toBe(5);
    expect(decoded.neighbors[0]).toEqual({
      shortNodeId: 0x1234,
      direction: H3Direction.NORTH,
      batteryLevel: 4,
      rssiTier: 3
    });
    expect(decoded.neighbors[4]).toEqual({
      shortNodeId: 0x1357,
      direction: H3Direction.SOUTH_WEST,
      batteryLevel: 1,
      rssiTier: 3
    });
  });

  it('should correctly pack and unpack Neighbor Fused Byte (3b H3 + 3b Bat + 2b RSSI)', () => {
    // Direction: SOUTH_WEST (5 = 0b101)
    // Battery: 4 (0b100)
    // RSSI: 3 (0b11)
    // Expected: 0b101 | (0b100 << 3) | (0b11 << 6) = 5 | 32 | 192 = 229 (0xE5)
    const fused = PacketSerializer.packNeighborFusedByte(H3Direction.SOUTH_WEST, 4, 3);
    expect(fused).toBe(0b11100101);

    const unpacked = PacketSerializer.unpackNeighborFusedByte(fused);
    expect(unpacked.direction).toBe(H3Direction.SOUTH_WEST);
    expect(unpacked.batteryLevel).toBe(4);
    expect(unpacked.rssiTier).toBe(3);
  });

  it('should handle partial neighbors list (e.g. 2 neighbors) and pad remaining slots with zero', () => {
    const chirpInput = {
      hopCount: 1,
      ourShortNodeId: 0x001122,
      batteryLevel: 3,
      isCharging: false,
      statusFlags: 0,
      ourH3Index: 0x12345678,
      radioCapabilities: RadioCapabilitiesBitmask.BLE_ACTIVE,
      neighbors: [
        { shortNodeId: 0xaaaa, direction: H3Direction.SAME_CELL, batteryLevel: 5, rssiTier: 2 },
        { shortNodeId: 0xbbbb, direction: H3Direction.NORTH_WEST, batteryLevel: 2, rssiTier: 1 }
      ]
    };

    const rawBuffer = PacketSerializer.serializePresenceChirp(chirpInput);
    expect(rawBuffer.length).toBe(27);

    const decoded = PacketSerializer.deserializePresenceChirp(rawBuffer);
    expect(decoded.neighbors.length).toBe(2);
    expect(decoded.neighbors[0].shortNodeId).toBe(0xaaaa);
    expect(decoded.neighbors[1].shortNodeId).toBe(0xbbbb);
  });

  it('should detect CRC-16 mismatch and reject tampered packet', () => {
    const chirpInput = {
      hopCount: 0,
      ourShortNodeId: 0x111111,
      batteryLevel: 4,
      isCharging: false,
      statusFlags: 0,
      ourH3Index: 0x99999999,
      radioCapabilities: RadioCapabilitiesBitmask.BLE_ACTIVE,
      neighbors: []
    };

    const rawBuffer = PacketSerializer.serializePresenceChirp(chirpInput);
    const tampered = new Uint8Array(rawBuffer);
    tampered[4] ^= 0x01; // Tamper battery byte

    expect(() => PacketSerializer.deserializePresenceChirp(tampered)).toThrow(/CRC-16 mismatch/);
  });

  it('should leave 4 bytes unallocated headroom inside BLE Legacy 31-byte limit', () => {
    const chirp = PacketSerializer.serializePresenceChirp({
      hopCount: 1,
      ourShortNodeId: 0x123456,
      batteryLevel: 3,
      isCharging: false,
      statusFlags: 0,
      ourH3Index: 0x11223344,
      radioCapabilities: 0,
      neighbors: []
    });

    const bleEnvelope = new Uint8Array(31);
    bleEnvelope.set(chirp, 0);

    // 27 bytes filled, exactly 4 bytes headroom remaining (31 - 27 = 4)
    expect(31 - chirp.length).toBe(4);
    expect(bleEnvelope.subarray(27).every(byte => byte === 0)).toBe(true);
  });
});
