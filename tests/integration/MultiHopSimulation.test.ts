/**
 * 15-Hop Multi-Hop Relay Simulation & Anti-Loop Validation
 * Simulates 15 physical nodes forwarding packets across linear disaster terrain
 * Validates Epidemic Routing, Dynamic Hop Decay, and Loop Prevention
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Multi-Hop E2E Simulation
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, it, expect } from 'bun:test';
import { EpidemicRouter } from '../../src/core/routing/EpidemicRouter';
import { ITOGPacket, TOGPacketType, TOGPriority } from '../../src/core/protocol/TOGPacket';
import { BloomFilter } from '../../src/core/protocol/BloomFilter';

describe('MultiHopMeshSimulation (15-Hop Relay & Anti-Loop Storm Guard)', () => {
  it('should propagate packet across 15 hops without loops or packet storms', () => {
    const NODE_COUNT = 15;
    const routers: EpidemicRouter[] = [];

    // Instantiate 15 virtual mesh nodes
    for (let i = 0; i < NODE_COUNT; i++) {
      const bloom = new BloomFilter(1000, 3);
      routers.push(new EpidemicRouter(`node-${i}`, 0x8828308281fffff0n, bloom));
    }

    // Node 0 originates emergency packet with TTL = 15
    const originalPacket: ITOGPacket = {
      header: {
        magic: 0x544F,
        version: 1,
        packetType: TOGPacketType.SOS_BEACON,
        ttlHops: 15,
        priority: TOGPriority.CRITICAL_SOS,
        flags: 0,
        reserved: 0,
      },
      messageId: 77778888n,
      senderPubkeyHash: new Uint8Array([0xAA, 1, 2, 3, 4, 5, 6, 7]),
      recipientHash: new Uint8Array(8), // Broadcast
      targetH3Index: 0x8828308281fffff0n,
      payloadLength: 5,
      payload: new Uint8Array([1, 2, 3, 4, 5]),
    };

    let currentPacket: ITOGPacket | null = originalPacket;
    let hopsTraversed = 0;

    // Simulate linear hop propagation: Node 0 -> Node 1 -> ... -> Node 13
    for (let i = 0; i < NODE_COUNT - 1; i++) {
      const currentRouter = routers[i];

      // Current router relays packet
      const forwardedPacket = currentRouter.relayPacket(currentPacket!);
      expect(forwardedPacket).not.toBeNull();
      expect(forwardedPacket!.header.ttlHops).toBe(15 - (i + 1));

      // Anti-loop verification: Re-sending same packet to current router MUST be dropped
      const duplicateDrop = currentRouter.relayPacket(currentPacket!);
      expect(duplicateDrop).toBeNull(); // Dropped by Bloom filter

      currentPacket = forwardedPacket;
      hopsTraversed++;
    }

    // Packet successfully traversed 14 hops to reach Node 14
    expect(hopsTraversed).toBe(14);
    expect(currentPacket?.header.ttlHops).toBe(1);

    // Final hop at Node 14: TTL is 1, so forwarding stops (shouldForward returns false)
    const finalHop = routers[14].relayPacket(currentPacket!);
    expect(finalHop).toBeNull(); // Terminal reception
  });
});
