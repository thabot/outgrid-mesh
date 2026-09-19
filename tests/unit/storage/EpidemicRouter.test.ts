/**
 * Unit tests for EpidemicRouter (Gossip Forwarding, Target Flooding, Anti-Loop)
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, expect, it } from 'bun:test';
import { EpidemicRouter } from '../../../src/core/routing/EpidemicRouter';
import { BloomFilter } from '../../../src/core/protocol/BloomFilter';
import {
  TOG_MAGIC,
  TOGPacketType,
  TOGPriority,
  type ITOGPacket
} from '../../../src/core/protocol/TOGPacket';

describe('EpidemicRouter (Gossip & Targeted Flood Router)', () => {
  it('should forward packet and decrement TTL by 1 on first reception', () => {
    const filter = new BloomFilter(1000, 0.001);
    const router = new EpidemicRouter('node-A', 0x88654c5525fffff0n, filter);

    const incoming: ITOGPacket = {
      header: {
        magic: TOG_MAGIC,
        version: 1,
        packetType: TOGPacketType.DIRECT_CHAT,
        ttlHops: 5,
        priority: TOGPriority.NORMAL,
        flags: 0,
        reserved: 0
      },
      messageId: 998877665544332211n,
      senderPubkeyHash: new Uint8Array(8),
      recipientHash: new Uint8Array(8),
      targetH3Index: 0x88654c5525fffff0n,
      payloadLength: 4,
      payload: new Uint8Array([1, 2, 3, 4])
    };

    const forwarded = router.relayPacket(incoming);
    expect(forwarded).not.toBeNull();
    expect(forwarded?.header.ttlHops).toBe(4); // Decremented from 5 to 4
  });

  it('should suppress duplicate packets when re-received (Anti-Loop Storm Guard)', () => {
    const filter = new BloomFilter(1000, 0.001);
    const router = new EpidemicRouter('node-B', 0x88654c5525fffff0n, filter);

    const packet: ITOGPacket = {
      header: {
        magic: TOG_MAGIC,
        version: 1,
        packetType: TOGPacketType.DIRECT_CHAT,
        ttlHops: 4,
        priority: TOGPriority.NORMAL,
        flags: 0,
        reserved: 0
      },
      messageId: 5555555555n,
      senderPubkeyHash: new Uint8Array(8),
      recipientHash: new Uint8Array(8),
      targetH3Index: 0x88654c5525fffff0n,
      payloadLength: 0,
      payload: new Uint8Array(0)
    };

    // First relay: Success
    const firstRelay = router.relayPacket(packet);
    expect(firstRelay).not.toBeNull();

    // Second relay of same packet: Must be dropped!
    const secondRelay = router.relayPacket(packet);
    expect(secondRelay).toBeNull();
  });

  it('should stop forwarding when TTL reaches 1 or 0', () => {
    const filter = new BloomFilter(1000, 0.001);
    const router = new EpidemicRouter('node-C', 0x88654c5525fffff0n, filter);

    const expiredPacket: ITOGPacket = {
      header: {
        magic: TOG_MAGIC,
        version: 1,
        packetType: TOGPacketType.DIRECT_CHAT,
        ttlHops: 1, // TTL = 1, cannot hop further
        priority: TOGPriority.NORMAL,
        flags: 0,
        reserved: 0
      },
      messageId: 111222333n,
      senderPubkeyHash: new Uint8Array(8),
      recipientHash: new Uint8Array(8),
      targetH3Index: 0x88654c5525fffff0n,
      payloadLength: 0,
      payload: new Uint8Array(0)
    };

    const result = router.relayPacket(expiredPacket);
    expect(result).toBeNull();
  });
});
