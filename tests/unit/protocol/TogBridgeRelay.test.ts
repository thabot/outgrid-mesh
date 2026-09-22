/**
 * Unit tests for TogBridgeRelay (Cross-Radio BLE <-> LoRa Bridge Engine)
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, expect, it } from 'bun:test';
import { TogBridgeRelay } from '../../../src/core/protocol/TogBridgeRelay';
import { PacketSerializer } from '../../../src/core/protocol/PacketSerializer';
import {
  TOGPacketType,
  H3Direction,
  RadioCapabilitiesBitmask,
  CannedEmergencyCode
} from '../../../src/core/protocol/TOGPacket';
import { CRC16 } from '../../../src/core/protocol/CRC16';

describe('TogBridgeRelay (Cross-Radio LoRa Bridge Forwarding)', () => {
  it('should forward high-priority SOS_BEACON immediately (Preemption)', () => {
    const bridge = new TogBridgeRelay();

    // Create a 21-byte SOS beacon
    const sosBeacon = PacketSerializer.serializeCompactSosBeacon(
      1,
      0x88654c5525fffff0n,
      -50,
      120,
      90,
      0x01
    );

    const result = bridge.evaluateAndForward(sosBeacon);
    expect(result.forwarded).toBe(true);
    expect(result.reason).toBe('FORWARDED_LORA');
    expect(result.transmittedBytes).toBeDefined();
    expect(result.transmittedBytes!.length).toBe(21);
  });

  it('should drop duplicate packets within the 60-second dedup window (Loop Storm Guard)', () => {
    const bridge = new TogBridgeRelay({ dedupWindowMs: 60_000 });

    const sosBeacon = PacketSerializer.serializeCompactSosBeacon(
      2,
      0x88654c5525fffff0n,
      0,
      0,
      75,
      0x00
    );

    const now = 100_000;
    // First reception -> Forwarded
    const res1 = bridge.evaluateAndForward(sosBeacon, now);
    expect(res1.forwarded).toBe(true);

    // Second reception within 60s (e.g. at +15s) -> Dropped duplicate
    const res2 = bridge.evaluateAndForward(sosBeacon, now + 15_000);
    expect(res2.forwarded).toBe(false);
    expect(res2.reason).toBe('DROPPED_DUPLICATE');

    // Third reception after window expires (at +61s) -> Forwarded again
    const res3 = bridge.evaluateAndForward(sosBeacon, now + 61_000);
    expect(res3.forwarded).toBe(true);
  });

  it('should rate-limit PRESENCE_CHIRP to 1 per 60s per H3 cell', () => {
    const bridge = new TogBridgeRelay({ presenceIntervalMs: 60_000 });

    const chirp1 = PacketSerializer.serializePresenceChirp({
      hopCount: 2,
      ourShortNodeId: 0x111111,
      batteryLevel: 4,
      isCharging: false,
      statusFlags: 0,
      ourH3Index: 0x89283082, // Cell A
      radioCapabilities: RadioCapabilitiesBitmask.BLE_ACTIVE,
      neighbors: []
    });

    const chirp2SameCell = PacketSerializer.serializePresenceChirp({
      hopCount: 2,
      ourShortNodeId: 0x222222,
      batteryLevel: 3,
      isCharging: false,
      statusFlags: 0,
      ourH3Index: 0x89283082, // Same Cell A, different node
      radioCapabilities: RadioCapabilitiesBitmask.BLE_ACTIVE,
      neighbors: []
    });

    const now = 50_000;
    // First chirp from Cell A -> Forwarded
    const res1 = bridge.evaluateAndForward(chirp1, now);
    expect(res1.forwarded).toBe(true);

    // Second chirp from same Cell A within 60s -> Dropped rate limited
    const res2 = bridge.evaluateAndForward(chirp2SameCell, now + 10_000);
    expect(res2.forwarded).toBe(false);
    expect(res2.reason).toBe('DROPPED_RATE_LIMITED');
  });

  it('should strictly drop forbidden large media chunks from being uploaded to LoRa', () => {
    const bridge = new TogBridgeRelay();

    // Fabricate a Direct Chat / Media packet with large length (>70 bytes)
    const largeMediaPacket = new Uint8Array(180);
    largeMediaPacket[0] = TOGPacketType.DIRECT_CHAT & 0x1f;

    const result = bridge.evaluateAndForward(largeMediaPacket);
    expect(result.forwarded).toBe(false);
    expect(result.reason).toBe('DROPPED_FORBIDDEN_MEDIA');
  });

  it('should maintain Zero-Payload Mutation and update Hop Count with valid CRC-16 for Presence Chirp', () => {
    const bridge = new TogBridgeRelay();

    const originalChirp = PacketSerializer.serializePresenceChirp({
      hopCount: 3,
      ourShortNodeId: 0x554433,
      batteryLevel: 5,
      isCharging: true,
      statusFlags: 0,
      ourH3Index: 0x12345678,
      radioCapabilities: RadioCapabilitiesBitmask.BLE_ACTIVE,
      neighbors: [
        { shortNodeId: 0x9999, direction: H3Direction.NORTH, batteryLevel: 5, rssiTier: 3 }
      ]
    });

    const result = bridge.evaluateAndForward(originalChirp);
    expect(result.forwarded).toBe(true);
    expect(result.remainingHopCount).toBe(2);

    // Transmitted bytes must be a valid 15-byte dynamic packet with valid CRC-16
    const transmitted = result.transmittedBytes!;
    expect(transmitted.length).toBe(15);

    const decoded = PacketSerializer.deserializePresenceChirp(transmitted);
    expect(decoded.hopCount).toBe(2); // Reduced by 1
    expect(decoded.ourShortNodeId).toBe(0x554433); // Unchanged!
    expect(decoded.ourH3Index).toBe(0x12345678);  // Unchanged!
    expect(decoded.batteryLevel).toBe(5);          // Unchanged!
  });

  it('should forward 10-byte Canned Emergency Status without payload corruption', () => {
    const bridge = new TogBridgeRelay();
    const cannedPacket = PacketSerializer.serializeCannedEmergency({
      hopCount: 2,
      senderShortId: 0x6543,
      recipientShortId: 0xffff,
      sequenceId: 101,
      statusCode: CannedEmergencyCode.NEED_FOOD_WATER
    });

    const result = bridge.evaluateAndForward(cannedPacket);
    expect(result.forwarded).toBe(true);
    expect(result.transmittedBytes!.length).toBe(10);
    const decoded = PacketSerializer.deserializeCannedEmergency(result.transmittedBytes!);
    expect(decoded.senderShortId).toBe(0x6543);
    expect(decoded.statusCode).toBe(CannedEmergencyCode.NEED_FOOD_WATER);
  });
});
