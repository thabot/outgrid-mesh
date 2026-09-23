/**
 * Unit Test Suite for 3-Tier Routing, Local Cell Micro-Flood, BT 4.2 Uplink Proxy & Delivery ACK 10B
 * Protocol: TOG v1.1 Routing & Wire Format
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { EpidemicRouter } from '../../../src/core/routing/EpidemicRouter';
import { BloomFilter } from '../../../src/core/protocol/BloomFilter';
import { PacketSerializer } from '../../../src/core/protocol/PacketSerializer';
import {
  TOGPacketType,
  type ITOGPacket,
  type IDeliveryAckPacket
} from '../../../src/core/protocol/TOGPacket';

describe('Leaf Node Delivery & 3-Tier Routing Test Suite', () => {
  let router: EpidemicRouter;
  let bloomFilter: BloomFilter;
  const myNodeId = 'node-self-47';
  const myH3Res9 = BigInt('0x8965646b14ffffff');

  beforeEach(() => {
    bloomFilter = new BloomFilter(1024, 3);
    router = new EpidemicRouter(myNodeId, myH3Res9, bloomFilter);
  });

  describe('3-Tier Routing Engine & Gossip Forwarding', () => {
    it('should consume SOS broadcast packet locally and forward to neighbors', () => {
      router.updateNeighbor({
        nodeId: 'node-neighbor-1',
        h3Index: myH3Res9,
        rssi: -65,
        lastSeenAt: Date.now(),
        supportsLeCodedPhy: true
      });

      const sosPacket: ITOGPacket = {
        header: {
          magic: 0x544f,
          version: 1,
          packetType: TOGPacketType.SOS_BEACON,
          ttlHops: 15,
          priority: 3,
          flags: 0,
          reserved: 0
        },
        messageId: 1001n,
        senderPubkeyHash: new Uint8Array(8),
        recipientHash: new Uint8Array(8),
        targetH3Index: 0n, // Broadcast
        payloadLength: 4,
        payload: new Uint8Array([1, 2, 3, 4])
      };

      const result = router.routeInboundPacket(sosPacket);
      expect(result.isLocalConsumption).toBe(true);
      expect(result.forwardPackets.length).toBe(1);
      expect(result.forwardPackets[0].packet.header.ttlHops).toBe(14);
    });

    it('should trigger Local Cell Micro-Flood with ttlHops <= 2 when arriving at destination cell but leaf node is not direct neighbor', () => {
      router.updateNeighbor({
        nodeId: 'node-neighbor-relay',
        h3Index: myH3Res9,
        rssi: -70,
        lastSeenAt: Date.now(),
        supportsLeCodedPhy: true
      });

      const cellPacket: ITOGPacket = {
        header: {
          magic: 0x544f,
          version: 1,
          packetType: TOGPacketType.DIRECT_CHAT,
          ttlHops: 10,
          priority: 1,
          flags: 0,
          reserved: 0
        },
        messageId: 1002n,
        senderPubkeyHash: new Uint8Array(8),
        recipientHash: new Uint8Array(8),
        targetH3Index: myH3Res9,
        payloadLength: 4,
        payload: new Uint8Array([1, 2, 3, 4])
      };

      const result = router.routeInboundPacket(cellPacket, 'unknown-target-in-cell');
      expect(result.isLocalConsumption).toBe(false);
      expect(result.forwardPackets.length).toBe(1);
      // Micro-flood TTL clamped to <= 2
      expect(result.forwardPackets[0].packet.header.ttlHops).toBeLessThanOrEqual(2);
    });
  });

  describe('Opportunistic BT 4.2 Uplink Proxy', () => {
    it('should promote 10B legacy BT packet to 15-hop mesh packet when RSSI >= -85 dBm', () => {
      const rawLegacy = new Uint8Array(10);
      rawLegacy[0] = 0x01; // SOS
      const packet = router.handleLegacyBtUplink(rawLegacy, -75);

      expect(packet).not.toBeNull();
      expect(packet?.header.ttlHops).toBe(15);
      expect(packet?.header.priority).toBe(3);
    });

    it('should reject weak RSSI < -85 dBm for legacy uplink', () => {
      const rawLegacy = new Uint8Array(10);
      const packet = router.handleLegacyBtUplink(rawLegacy, -90);
      expect(packet).toBeNull();
    });
  });

  describe('DELIVERY_ACK 10-Byte Wire Format Serialization', () => {
    it('should serialize and deserialize IDeliveryAckPacket into exactly 10 bytes without distortion', () => {
      const ack: IDeliveryAckPacket = {
        packetType: TOGPacketType.DELIVERY_ACK,
        hopCount: 3,
        messageId: 0x12345678,
        recipientShortNodeId: 0x47a1b2,
        crc16: 0
      };

      const raw = PacketSerializer.serializeDeliveryAck(ack);
      expect(raw.length).toBe(10);

      const deserialized = PacketSerializer.deserializeDeliveryAck(raw);
      expect(deserialized.packetType).toBe(TOGPacketType.DELIVERY_ACK);
      expect(deserialized.hopCount).toBe(3);
      expect(deserialized.messageId).toBe(0x12345678);
      expect(deserialized.recipientShortNodeId).toBe(0x47a1b2);
    });
  });
});
