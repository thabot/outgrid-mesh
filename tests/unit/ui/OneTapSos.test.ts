/**
 * Unit tests for OneTapSosEngine
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, it, expect } from 'bun:test';
import { OneTapSosEngine, SosStatusCategory } from '../../../src/core/state/OneTapSosEngine';
import { TOGPacketType, TOGPriority } from '../../../src/core/protocol/TOGPacket';
import { H3DeltaCompressor } from '../../../src/core/spatial/H3DeltaCompressor';

describe('OneTapSosEngine (Single-Tap SOS Beacon)', () => {
  it('should package GPS, battery, category, and critical priority into compact 21B SOS beacon', () => {
    const lat = 13.7563;
    const lng = 100.5018;
    const senderHash = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);

    const packet = OneTapSosEngine.createSosBeacon({
      lat,
      lng,
      batteryLevel: 42,
      category: SosStatusCategory.TRAPPED_RUBBLE,
      senderPubkeyHash: senderHash,
    }, 12345678n);

    expect(packet.header.packetType).toBe(TOGPacketType.SOS_BEACON);
    expect(packet.header.priority).toBe(TOGPriority.CRITICAL_SOS);
    expect(packet.header.ttlHops).toBe(25);
    expect(packet.payloadLength).toBe(6); // 4B Delta + 1B Battery + 1B Category

    // Check payload details
    const payload = packet.payload;
    expect(payload[4]).toBe(42); // 42% battery
    expect(payload[5]).toBe(0x01); // TRAPPED_RUBBLE

    // Decompress coordinates
    const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
    const deltaX = view.getInt16(0, false);
    const deltaY = view.getInt16(2, false);
    const decompressed = H3DeltaCompressor.decompress(packet.targetH3Index, { deltaX, deltaY });

    expect(Math.abs(decompressed.lat - lat)).toBeLessThan(0.0001);
    expect(Math.abs(decompressed.lng - lng)).toBeLessThan(0.0001);
  });

  it('should correctly encode and decode all status categories', () => {
    const categories = [
      SosStatusCategory.TRAPPED_RUBBLE,
      SosStatusCategory.VULNERABLE_CHILD_ELDERLY,
      SosStatusCategory.NEED_BOAT,
      SosStatusCategory.OXYGEN_DEPLETION,
      SosStatusCategory.GENERAL_EMERGENCY,
    ];

    for (const cat of categories) {
      const code = OneTapSosEngine.encodeCategory(cat);
      const decoded = OneTapSosEngine.decodeCategory(code);
      expect(decoded).toBe(cat);
    }
  });
});
