/**
 * Unit tests for DataMuleTransfer
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { DataMuleTransfer } from '../../../src/core/native/DataMuleTransfer';
import { ITOGPacket, TOGPacketType, TOGPriority } from '../../../src/core/protocol/TOGPacket';

describe('DataMuleTransfer (Zero-Click Physical Transport)', () => {
  let mule: DataMuleTransfer;

  function createTestPacket(id: bigint): ITOGPacket {
    return {
      header: {
        magic: 0x544F,
        version: 1,
        packetType: TOGPacketType.DIRECT_CHAT,
        ttlHops: 7,
        priority: TOGPriority.NORMAL,
        flags: 0,
        reserved: 0,
      },
      messageId: id,
      senderPubkeyHash: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
      recipientHash: new Uint8Array([8, 7, 6, 5, 4, 3, 2, 1]),
      targetH3Index: 0x8828308281fffff0n,
      payloadLength: 3,
      payload: new Uint8Array([10, 20, 30]),
    };
  }

  beforeEach(() => {
    mule = new DataMuleTransfer(500);
  });

  it('should absorb stranded packets from disaster cluster', () => {
    const clusterPkts = [
      createTestPacket(1001n),
      createTestPacket(1002n),
      createTestPacket(1003n),
    ];

    const absorbed = mule.absorbFromCluster(clusterPkts);
    expect(absorbed).toBe(3);
    expect(mule.getStoredPacketCount()).toBe(3);
  });

  it('should offload only unknown packets to newly encountered cluster', () => {
    const p1 = createTestPacket(2001n);
    const p2 = createTestPacket(2002n);
    mule.absorbFromCluster([p1, p2]);

    // Destination cluster already received 2001
    const knownByCluster = new Set<string>(['2001']);

    const offloaded = mule.offloadToCluster(knownByCluster);
    expect(offloaded.length).toBe(1);
    expect(offloaded[0].messageId).toBe(2002n);
  });

  it('should prune acknowledged packets from Mule cache', () => {
    const p1 = createTestPacket(3001n);
    mule.absorbFromCluster([p1]);
    expect(mule.getStoredPacketCount()).toBe(1);

    mule.pruneAcknowledged(['3001']);
    expect(mule.getStoredPacketCount()).toBe(0);
  });
});
