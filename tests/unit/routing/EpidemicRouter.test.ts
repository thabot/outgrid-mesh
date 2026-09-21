import { describe, expect, it, beforeEach } from 'bun:test';
import { EpidemicRouter, type INeighborNode } from '../../../src/core/routing/EpidemicRouter';
import { BloomFilter } from '../../../src/core/protocol/BloomFilter';
import { TOGPacketType, TOGPriority } from '../../../src/core/protocol/TOGPacket';

describe('Phase 4 - Task 4.1: EpidemicRouter Quota, Scoring & Relay Exclusion', () => {
  let router: EpidemicRouter;
  let bloomFilter: BloomFilter;

  beforeEach(() => {
    bloomFilter = new BloomFilter(1024, 3);
    router = new EpidemicRouter('my-node', 0x8928308280fffff0n, bloomFilter, {
      maxTargetNeighbors: 5
    });
  });

  it('should calculate dynamic Priority Score properly', () => {
    const modern: INeighborNode = {
      nodeId: 'modern-1',
      h3Index: 1n,
      rssi: -40,
      batteryPct: 90,
      isStationary: true,
      supportsLeCodedPhy: true,
      isLegacyBt: false,
      lastSeenAt: Date.now()
    };

    const legacy: INeighborNode = {
      nodeId: 'legacy-1',
      h3Index: 2n,
      rssi: -70,
      batteryPct: 50,
      isStationary: false,
      supportsLeCodedPhy: false,
      isLegacyBt: true,
      lastSeenAt: Date.now()
    };

    const scoreModern = router.calculateNeighborScore(modern);
    const scoreLegacy = router.calculateNeighborScore(legacy);

    expect(scoreModern).toBeGreaterThan(scoreLegacy);
  });

  it('should enforce quota limits: max 5 peers, legacy capped at <= 2', () => {
    const now = Date.now();

    // Add 2 modern nodes
    router.updateNeighbor({
      nodeId: 'm1',
      h3Index: 1n,
      rssi: -50,
      isLegacyBt: false,
      supportsLeCodedPhy: true,
      lastSeenAt: now
    });
    router.updateNeighbor({
      nodeId: 'm2',
      h3Index: 2n,
      rssi: -55,
      isLegacyBt: false,
      supportsLeCodedPhy: true,
      lastSeenAt: now
    });

    // Add 4 legacy nodes
    for (let i = 1; i <= 4; i++) {
      router.updateNeighbor({
        nodeId: `l${i}`,
        h3Index: BigInt(10 + i),
        rssi: -60 - i,
        isLegacyBt: true,
        supportsLeCodedPhy: false,
        lastSeenAt: now
      });
    }

    const selected = router.getSelectedRoutingNeighbors(now);
    expect(selected.length).toBe(4); // 2 modern + max 2 legacy

    const legacySelected = selected.filter((n) => n.isLegacyBt);
    expect(legacySelected.length).toBeLessThanOrEqual(2);
  });

  it('should strictly exclude legacy nodes from multi-hop relay candidates', () => {
    const now = Date.now();
    router.updateNeighbor({
      nodeId: 'modern-node',
      h3Index: 1n,
      rssi: -40,
      isLegacyBt: false,
      supportsLeCodedPhy: true,
      lastSeenAt: now
    });
    router.updateNeighbor({
      nodeId: 'legacy-node',
      h3Index: 2n,
      rssi: -40,
      isLegacyBt: true,
      supportsLeCodedPhy: false,
      lastSeenAt: now
    });

    const dummyPacket = {
      header: {
        magic: 0x544F,
        version: 1,
        packetType: TOGPacketType.GROUP_CHAT,
        ttlHops: 5,
        priority: TOGPriority.NORMAL,
        flags: 0,
        reserved: 0
      },
      messageId: 100n,
      senderPubkeyHash: new Uint8Array(8),
      recipientHash: new Uint8Array(8),
      targetH3Index: 0n,
      payloadLength: 0,
      payload: new Uint8Array(0)
    };

    // Broadcast relay candidates
    const relays = router.selectRelayCandidates(dummyPacket);
    expect(relays.length).toBe(1);
    expect(relays[0].nodeId).toBe('modern-node');

    // Direct delivery to legacy node
    const directRelays = router.selectRelayCandidates(dummyPacket, 'legacy-node');
    expect(directRelays.length).toBe(1);
    expect(directRelays[0].nodeId).toBe('legacy-node');
  });

  it('should evict legacy nodes after 30s TTL or if RSSI < -85 dBm', () => {
    const now = 100000;
    router.updateNeighbor({
      nodeId: 'l-expired',
      h3Index: 1n,
      rssi: -60,
      isLegacyBt: true,
      lastSeenAt: now - 35000 // 35s ago (exceeds 30s TTL)
    });
    router.updateNeighbor({
      nodeId: 'l-weak',
      h3Index: 2n,
      rssi: -90, // < -85 dBm cutoff
      isLegacyBt: true,
      lastSeenAt: now - 5000
    });
    router.updateNeighbor({
      nodeId: 'm-alive',
      h3Index: 3n,
      rssi: -70,
      isLegacyBt: false,
      lastSeenAt: now - 50000 // 50s ago (within 120s TTL)
    });

    const active = router.getSelectedRoutingNeighbors(now);
    expect(active.length).toBe(1);
    expect(active[0].nodeId).toBe('m-alive');
  });
});
