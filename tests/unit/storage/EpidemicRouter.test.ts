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

  it('should prioritize BLE 5.0 nodes and fallback to BT 4.2 Legacy nodes only when quota is not met', () => {
    const filter = new BloomFilter(1000, 0.001);
    const router = new EpidemicRouter('node-D', 0x88654c5525fffff0n, filter, {
      maxTargetNeighbors: 3
    });

    // 2 Modern BLE nodes
    router.updateNeighbor({ nodeId: 'ble-1', h3Index: 0n, rssi: -60, lastSeenAt: Date.now(), isLegacyBt: false });
    router.updateNeighbor({ nodeId: 'ble-2', h3Index: 0n, rssi: -50, lastSeenAt: Date.now(), isLegacyBt: false });

    // 2 Legacy BT nodes
    router.updateNeighbor({ nodeId: 'legacy-1', h3Index: 0n, rssi: -40, lastSeenAt: Date.now(), isLegacyBt: true });
    router.updateNeighbor({ nodeId: 'legacy-2', h3Index: 0n, rssi: -45, lastSeenAt: Date.now(), isLegacyBt: true });

    // Target quota = 3 -> Should select 2 BLE nodes first, and 1 Legacy BT node to fill quota
    const selected = router.getSelectedRoutingNeighbors();
    expect(selected.length).toBe(3);
    expect(selected.some((n) => n.nodeId === 'ble-1')).toBe(true);
    expect(selected.some((n) => n.nodeId === 'ble-2')).toBe(true);
    // Best RSSI legacy node selected as fallback
    expect(selected.some((n) => n.nodeId === 'legacy-1')).toBe(true);
    expect(selected.some((n) => n.nodeId === 'legacy-2')).toBe(false);
  });

  it('should strictly exclude Legacy BT nodes from candidate relays for multi-hop messages', () => {
    const filter = new BloomFilter(1000, 0.001);
    const router = new EpidemicRouter('node-E', 0x88654c5525fffff0n, filter, {
      maxTargetNeighbors: 4
    });

    router.updateNeighbor({ nodeId: 'ble-node', h3Index: 0n, rssi: -70, lastSeenAt: Date.now(), isLegacyBt: false });
    router.updateNeighbor({ nodeId: 'legacy-node', h3Index: 0n, rssi: -40, lastSeenAt: Date.now(), isLegacyBt: true });

    const multiHopPacket: ITOGPacket = {
      header: {
        magic: TOG_MAGIC,
        version: 1,
        packetType: TOGPacketType.DIRECT_CHAT,
        ttlHops: 5, // multi-hop to distant area
        priority: TOGPriority.NORMAL,
        flags: 0,
        reserved: 0
      },
      messageId: 444555n,
      senderPubkeyHash: new Uint8Array(8),
      recipientHash: new Uint8Array(8),
      targetH3Index: 0x88654c5525fffff0n,
      payloadLength: 0,
      payload: new Uint8Array(0)
    };

    // Relay selection for multi-hop packet: Legacy node must be EXCLUDED!
    const relays = router.selectRelayCandidates(multiHopPacket);
    expect(relays.length).toBe(1);
    expect(relays[0].nodeId).toBe('ble-node');
    expect(relays.some((r) => r.nodeId === 'legacy-node')).toBe(false);

    // Direct message to legacy node: Allowed
    const directRelays = router.selectRelayCandidates(multiHopPacket, 'legacy-node');
    expect(directRelays.length).toBe(1);
    expect(directRelays[0].nodeId).toBe('legacy-node');
  });
});
