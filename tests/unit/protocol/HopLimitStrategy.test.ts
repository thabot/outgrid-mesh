/**
 * Unit tests for HopLimitStrategy across TOG v1.1 protocol
 * Verifies hop limits for all packet types and LoRa hardware bridge clamp
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, expect, it } from 'bun:test';
import {
  DEFAULT_SOS_HOPS,
  DEFAULT_ACK_HOPS,
  DEFAULT_CRISIS_FEED_HOPS,
  DEFAULT_CHAT_HOPS,
  DEFAULT_PRESENCE_HOPS,
  TOGPacketType,
  TOGPriority,
  TOG_MAGIC,
  type ITOGPacket,
} from '../../../src/core/protocol/TOGPacket';
import { MeshtasticAdapter } from '../../../src/core/adapters/meshtasticAdapter';
import { OneTapSosEngine, SosStatusCategory } from '../../../src/core/state/OneTapSosEngine';
import { DeliveryReceipt } from '../../../src/core/routing/DeliveryReceipt';

import { DigitalSignature } from '../../../src/core/crypto/DigitalSignature';

describe('HopLimitStrategy (Flood Resilience & Balanced Mesh)', () => {
  it('should define standardized hop limits with emergency tiers prioritized', () => {
    // SOS and ACK must have matching long reach (25 hops) for two-way survival loop
    expect(DEFAULT_SOS_HOPS).toBe(25);
    expect(DEFAULT_ACK_HOPS).toBe(25);

    // Crisis feed must cover wide area (20 hops)
    expect(DEFAULT_CRISIS_FEED_HOPS).toBe(20);

    // Chat must be bounded to preserve battery and channel airtime (8 hops)
    expect(DEFAULT_CHAT_HOPS).toBe(8);

    // Presence chirp strictly link-local (2 hops)
    expect(DEFAULT_PRESENCE_HOPS).toBe(2);
  });

  it('should generate SOS beacon with 25 hops', () => {
    const packet = OneTapSosEngine.createSosBeacon({
      lat: 18.7883,
      lng: 98.9853,
      batteryLevel: 80,
      category: SosStatusCategory.NEED_BOAT,
      senderPubkeyHash: new Uint8Array(8),
    });

    expect(packet.header.packetType).toBe(TOGPacketType.SOS_BEACON);
    expect(packet.header.ttlHops).toBe(25);
  });

  it('should generate reverse signed ACK with 25 hops', () => {
    const keys = DigitalSignature.generateKeyPair();
    const ackPacket = DeliveryReceipt.createSignedAck(
      123456789n,
      keys.privateKey,
      new Uint8Array(8),
      new Uint8Array(8),
      0x88654c5525fffff0n
    );

    expect(ackPacket.header.packetType).toBe(TOGPacketType.DELIVERY_ACK);
    expect(ackPacket.header.ttlHops).toBe(25);
  });

  it('should clamp high-hop packets to LoRa maximum (7 hops) when bridging to Meshtastic', () => {
    const sosPacket: ITOGPacket = {
      header: {
        magic: TOG_MAGIC,
        version: 1,
        packetType: TOGPacketType.SOS_BEACON,
        ttlHops: DEFAULT_SOS_HOPS, // 25 hops
        priority: TOGPriority.CRITICAL_SOS,
        flags: 0,
        reserved: 0,
      },
      messageId: 11223344n,
      senderPubkeyHash: new Uint8Array(8),
      recipientHash: new Uint8Array(8),
      targetH3Index: 0x88654c5525fffff0n,
      payloadLength: 4,
      payload: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
    };

    const loraPayload = MeshtasticAdapter.togToMeshtastic(sosPacket);
    // Standard LoRa mesh can handle up to 7 hops due to airtime constraints
    expect(loraPayload.hopLimit).toBe(7);
  });

  it('should preserve lower hop limits when bridging to Meshtastic', () => {
    const chirpPacket: ITOGPacket = {
      header: {
        magic: TOG_MAGIC,
        version: 1,
        packetType: TOGPacketType.PRESENCE_CHIRP,
        ttlHops: DEFAULT_PRESENCE_HOPS, // 2 hops
        priority: TOGPriority.LOW,
        flags: 0,
        reserved: 0,
      },
      messageId: 55667788n,
      senderPubkeyHash: new Uint8Array(8),
      recipientHash: new Uint8Array(8),
      targetH3Index: 0x88654c5525fffff0n,
      payloadLength: 1,
      payload: new Uint8Array([0x01]),
    };

    const loraPayload = MeshtasticAdapter.togToMeshtastic(chirpPacket);
    expect(loraPayload.hopLimit).toBe(2);
  });
});
