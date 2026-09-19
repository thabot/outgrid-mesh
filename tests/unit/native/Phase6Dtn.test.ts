/**
 * Unit tests for Phase 6 DTN Data Mule, Store-and-Forward & Velocity Tracker
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, expect, it } from 'bun:test';
import { BundleStore, type IDtnBundle } from '../../../src/core/dtn/BundleStore';
import { MobilityTracker } from '../../../src/core/dtn/MobilityTracker';
import { HopGovernance, TTL_EXTENDED_SOS_MS, TTL_EXTENDED_CHAT_MS } from '../../../src/core/dtn/HopGovernance';
import { NetworkHealingEngine } from '../../../src/core/dtn/NetworkHealingEngine';

describe('Phase 6: DTN Data Mule, Store-and-Forward & Velocity Tracker', () => {
  describe('Task 6.1: DTN Store-and-Forward Bundle Custody Engine', () => {
    it('should store bundles and support peer-differential exchange', () => {
      const store = new BundleStore();
      const now = Date.now();

      const b1: IDtnBundle = {
        id: 'bundle-01',
        bundleData: new Uint8Array([1, 2, 3]),
        priority: 0x08,
        createdAt: now,
        expiresAt: now + 5 * 24 * 3600 * 1000,
        hopCount: 2,
        isHopFrozen: false,
        destinationH3: 0x88654c5525fffff0n
      };
      const b2: IDtnBundle = {
        id: 'bundle-02',
        bundleData: new Uint8Array([4, 5, 6]),
        priority: 0x0F,
        createdAt: now,
        expiresAt: now + 7 * 24 * 3600 * 1000,
        hopCount: 1,
        isHopFrozen: false,
        destinationH3: 0x88654c5525fffff0n
      };

      store.storeBundle(b1);
      store.storeBundle(b2);

      expect(store.count()).toBe(2);

      // Peer already has bundle-01
      const peerKnown = new Set(['bundle-01']);
      const missing = store.getMissingBundlesForPeer(peerKnown);

      expect(missing.length).toBe(1);
      expect(missing[0].id).toBe('bundle-02');
    });
  });

  describe('Task 6.2: Velocity Azimuth & Mobility Tracker', () => {
    it('should designate vehicle as High-Priority Data Mule when speed is between 20 and 80 km/h', () => {
      const tracker = new MobilityTracker();

      // Slow walking (4 km/h) -> Not a mule
      tracker.addFix({ latitude: 13.75, longitude: 100.49, speedKmh: 4.5, bearingDeg: 90, timestamp: 1000 });
      expect(tracker.isHighPriorityMule()).toBe(false);

      // Rescue boat / vehicle moving (45 km/h) -> High-Priority Data Mule
      tracker.addFix({ latitude: 13.76, longitude: 100.50, speedKmh: 45.0, bearingDeg: 120, timestamp: 2000 });
      expect(tracker.isHighPriorityMule()).toBe(true);
      expect(tracker.getCurrentBearing()).toBe(120);

      // Airplane / High speed train (120 km/h) -> Not a ground rescue mule
      tracker.addFix({ latitude: 13.78, longitude: 100.52, speedKmh: 120.0, bearingDeg: 120, timestamp: 3000 });
      expect(tracker.isHighPriorityMule()).toBe(false);
    });
  });

  describe('Task 6.3: Hop Freeze & Extended TTL Governance', () => {
    it('should freeze hop count during Data Mule transit and grant extended TTLs', () => {
      const bundle: IDtnBundle = {
        id: 'bundle-test',
        bundleData: new Uint8Array(10),
        priority: 0x0F,
        createdAt: 1000,
        expiresAt: 1000 + TTL_EXTENDED_SOS_MS,
        hopCount: 3,
        isHopFrozen: false,
        destinationH3: 0x88654c5525fffff0n
      };

      // Carried by Mule -> Hop count frozen
      const hopsDuringMule = HopGovernance.processHop(bundle, true);
      expect(hopsDuringMule).toBe(3);
      expect(bundle.isHopFrozen).toBe(true);

      // Delivered to local mesh -> Normal hop increment
      const hopsAfterMule = HopGovernance.processHop(bundle, false);
      expect(hopsAfterMule).toBe(4);
      expect(bundle.isHopFrozen).toBe(false);

      // Extended TTL checks: 14 days for SOS, 7 days for Chat
      expect(HopGovernance.getExtendedTtl(true)).toBe(14 * 24 * 60 * 60 * 1000);
      expect(HopGovernance.getExtendedTtl(false)).toBe(7 * 24 * 60 * 60 * 1000);
    });
  });

  describe('Task 6.4: Network Healing & Re-anchoring Engine', () => {
    it('should auto-flush bundles to Cloudflare coordinator when internet connectivity is re-established', async () => {
      const store = new BundleStore();
      store.storeBundle({
        id: 'evac-sos-01',
        bundleData: new Uint8Array([9, 9, 9]),
        priority: 0x0F,
        createdAt: Date.now(),
        expiresAt: Date.now() + 1000000,
        hopCount: 1,
        isHopFrozen: false,
        destinationH3: 0x88654c5525fffff0n
      });

      const healing = new NetworkHealingEngine(store);

      // Offline -> No upload
      healing.setOnlineStatus(false);
      const offlineResult = await healing.flushToCloudCoordinator(async () => true);
      expect(offlineResult.uploadedCount).toBe(0);

      // Re-anchored to Internet -> 100% flush
      healing.setOnlineStatus(true);
      const onlineResult = await healing.flushToCloudCoordinator(async () => true);
      expect(onlineResult.uploadedCount).toBe(1);
      expect(onlineResult.failedCount).toBe(0);
    });
  });
});
