/**
 * Unit tests for Autonomous Data Mule, Custody Transfer & Vaccine Kill Pill
 * Protocol: TOG v1.1 Master Project Plan v6.1 Phase 6 & Sprint G (Tasks G.1, G.2, G.3)
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, expect, it } from 'bun:test';
import { BundleStore, type IDtnBundle } from '../../../src/core/dtn/BundleStore';
import { MobilityTracker } from '../../../src/core/dtn/MobilityTracker';
import { DataMuleEngine, DataMuleState } from '../../../src/core/dtn/DataMuleEngine';
import { BundleCustodyManager, PACKET_TYPE_CUSTODY_ACCEPT } from '../../../src/core/dtn/BundleCustodyManager';
import { VaccineKillPillEngine, PACKET_TYPE_VACCINE_KILL_PILL } from '../../../src/core/dtn/VaccineKillPill';

describe('Sprint G: DTN Autonomous Data Mule, Custody Transfer & Vaccine Engine', () => {
  describe('Task G.1: Autonomous Data Mule Mode & Mobility Ingestion', () => {
    it('should transition to DATA_MULE_ACTIVE when sustained speed >= 15 km/h for 30s', () => {
      const store = new BundleStore();
      const tracker = new MobilityTracker();
      const mule = new DataMuleEngine(store, tracker);

      expect(mule.getState()).toBe(DataMuleState.IDLE);

      const t0 = 100000;
      // Start moving at 25 km/h
      mule.updateSpeed(25.0, t0);
      expect(mule.getState()).toBe(DataMuleState.IDLE); // Not sustained yet

      // Still moving at 25 km/h at 31 seconds later
      mule.updateSpeed(25.0, t0 + 31000);
      expect(mule.getState()).toBe(DataMuleState.DATA_MULE_ACTIVE);
      expect(tracker.isDataMuleActive()).toBe(true);
    });

    it('should perform opportunistic zero-click bundle exchange with peer nodes', () => {
      const store = new BundleStore();
      const mule = new DataMuleEngine(store);

      const now = Date.now();
      const peerBundles: IDtnBundle[] = [
        {
          id: 'sos-bundle-101',
          bundleData: new Uint8Array([1, 2, 3]),
          priority: 0x0F,
          triageLevel: 0x01, // Red SOS
          createdAt: now,
          expiresAt: now + 7 * 86400 * 1000,
          hopCount: 2,
          isHopFrozen: false,
          destinationH3: 0x88654c5525fffff0n
        },
        {
          id: 'chat-bundle-102',
          bundleData: new Uint8Array([4, 5, 6]),
          priority: 0x08,
          triageLevel: 0x02,
          createdAt: now,
          expiresAt: now + 2 * 86400 * 1000,
          hopCount: 1,
          isHopFrozen: false,
          destinationH3: 0x88654c5525fffff0n
        }
      ];

      const res = mule.performOpportunisticExchange(new Set(), peerBundles);
      expect(res.ingestedCount).toBe(2);
      expect(store.count()).toBe(2);
      expect(store.getBundle('sos-bundle-101')).toBeDefined();
    });

    it('should enter UNLOADING state when stationary in shelter or online zone', async () => {
      const store = new BundleStore();
      const tracker = new MobilityTracker();
      const mule = new DataMuleEngine(store, tracker);

      store.storeBundle({
        id: 'bundle-test',
        bundleData: new Uint8Array(5),
        priority: 0x0F,
        createdAt: Date.now(),
        expiresAt: Date.now() + 100000,
        hopCount: 1,
        isHopFrozen: false,
        destinationH3: 0x88654c5525fffff0n
      });

      // Moving vehicle enters shelter and stops (0 km/h)
      tracker.addFix({ latitude: 13.75, longitude: 100.5, speedKmh: 0.0, bearingDeg: 0, timestamp: 2000 });
      mule.setOnlineStatus(true);

      expect(mule.getState()).toBe(DataMuleState.UNLOADING);

      // Automated unload to cloud gateway
      let uploadedCount = 0;
      const result = await mule.unloadBundlesToGateway(async (_b) => {
        uploadedCount++;
        return true;
      });

      expect(result.unloaded).toBe(1);
      expect(uploadedCount).toBe(1);
    });
  });

  describe('Task G.2: DTN Bundle Custody Transfer & Triage Eviction', () => {
    it('should complete 3-step custody handshake and prune local copy upon verified 0x08 acceptance', () => {
      const sourceStore = new BundleStore();
      const targetStore = new BundleStore();

      const sourceManager = new BundleCustodyManager('node-alpha', sourceStore);
      const targetManager = new BundleCustodyManager('node-beta', targetStore);

      const testBundle: IDtnBundle = {
        id: 'vital-sos-01',
        bundleData: new Uint8Array([9, 9, 9]),
        priority: 0x0F,
        triageLevel: 0x01,
        createdAt: 1000,
        expiresAt: 1000 + 7 * 86400 * 1000,
        hopCount: 1,
        isHopFrozen: false,
        destinationH3: 0x88654c5525fffff0n
      };

      // 1. Source stores and offers custody
      sourceStore.storeBundle(testBundle);
      const offer = sourceManager.createCustodyOffer('vital-sos-01', 'node-beta');
      expect(offer).not.toBeNull();
      expect(sourceStore.getBundle('vital-sos-01')?.custodyState).toBe('OFFERED');

      // 2. Target accepts custody and signs receipt
      const fakeSign = (data: Uint8Array) => new Uint8Array([0xAA, 0xBB, data.length]);
      const acceptPacket = targetManager.acceptCustodyOffer(testBundle, fakeSign);

      expect(acceptPacket.packetType).toBe(PACKET_TYPE_CUSTODY_ACCEPT);
      expect(targetStore.getBundle('vital-sos-01')?.custodyState).toBe('HELD');
      expect(targetStore.getBundle('vital-sos-01')?.custodianNodeId).toBe('node-beta');

      // 3. Source verifies acceptance and safely transfers custody
      const fakeVerify = (_data: Uint8Array, sig: Uint8Array, nodeId: string) => {
        return nodeId === 'node-beta' && sig[0] === 0xAA;
      };

      const transferred = sourceManager.processCustodyAccept(acceptPacket, fakeVerify);
      expect(transferred).toBe(true);

      // Source no longer holds local bundle copy; target holds it safely
      expect(sourceStore.getBundle('vital-sos-01')).toBeUndefined();
      expect(targetStore.getBundle('vital-sos-01')).toBeDefined();
    });

    it('should strictly retain Red SOS (0x01) during triage memory congestion', () => {
      const store = new BundleStore();
      const now = Date.now();

      // Store 3 Yellow/Green non-critical bundles
      store.storeBundle({
        id: 'chat-01',
        bundleData: new Uint8Array(10),
        priority: 0x08,
        triageLevel: 0x02,
        createdAt: now - 1000,
        expiresAt: now + 100000,
        hopCount: 1,
        isHopFrozen: false,
        destinationH3: 1n
      });
      store.storeBundle({
        id: 'feed-02',
        bundleData: new Uint8Array(10),
        priority: 0x04,
        triageLevel: 0x03,
        createdAt: now - 2000,
        expiresAt: now + 100000,
        hopCount: 1,
        isHopFrozen: false,
        destinationH3: 1n
      });

      // Store 1 Critical Red SOS (0x01)
      store.storeBundle({
        id: 'critical-red-sos',
        bundleData: new Uint8Array(10),
        priority: 0x0F,
        triageLevel: 0x01,
        createdAt: now - 3000,
        expiresAt: now + 100000,
        hopCount: 1,
        isHopFrozen: false,
        destinationH3: 1n
      });

      expect(store.count()).toBe(3);

      // Enforce strict limit down to 1 bundle
      const evicted = store.enforceTriageEviction(1);
      expect(evicted).toBe(2);
      expect(store.count()).toBe(1);

      // LIFE-SAFETY INVARIANT: The only remaining bundle MUST be Red SOS
      const remaining = store.getBundle('critical-red-sos');
      expect(remaining).toBeDefined();
      expect(remaining?.triageLevel).toBe(0x01);
    });
  });

  describe('Task G.3: Epidemic Vaccine Kill Pill Engine', () => {
    it('should generate signed 0x09 Vaccine Kill Pill and instantly purge bundle within 100ms', () => {
      const store = new BundleStore();
      const engine = new VaccineKillPillEngine(store, ['auth-commander']);

      store.storeBundle({
        id: 'case-rescued-888',
        bundleData: new Uint8Array(10),
        priority: 0x0F,
        triageLevel: 0x01,
        createdAt: 1000,
        expiresAt: 2000,
        hopCount: 1,
        isHopFrozen: false,
        destinationH3: 1n
      });

      expect(store.getBundle('case-rescued-888')).toBeDefined();

      const signFn = (data: Uint8Array) => new Uint8Array([0x55, data.length]);
      const vaccine = engine.createVaccine('case-rescued-888', 'auth-commander', signFn);

      expect(vaccine.packetType).toBe(PACKET_TYPE_VACCINE_KILL_PILL);
      expect(engine.isVaccinated('case-rescued-888')).toBe(true);

      // Immediately purged from local storage
      expect(store.getBundle('case-rescued-888')).toBeUndefined();
    });

    it('should propagate vaccine across peer nodes and blacklist target case', () => {
      const peerStore = new BundleStore();
      const peerEngine = new VaccineKillPillEngine(peerStore, ['auth-commander']);

      peerStore.storeBundle({
        id: 'case-rescued-888',
        bundleData: new Uint8Array(10),
        priority: 0x0F,
        triageLevel: 0x01,
        createdAt: 1000,
        expiresAt: 2000,
        hopCount: 1,
        isHopFrozen: false,
        destinationH3: 1n
      });

      const incomingVaccine = {
        packetType: PACKET_TYPE_VACCINE_KILL_PILL,
        bundleId: 'case-rescued-888',
        authorityId: 'auth-commander',
        resolvedAt: Date.now(),
        authoritySignature: new Uint8Array([0x55, 10])
      };

      const verifyFn = (_data: Uint8Array, sig: Uint8Array, authId: string) => {
        return authId === 'auth-commander' && sig[0] === 0x55;
      };

      const ingested = peerEngine.ingestVaccine(incomingVaccine, verifyFn);
      expect(ingested).toBe(true);

      // Purged on peer
      expect(peerStore.getBundle('case-rescued-888')).toBeUndefined();
      expect(peerEngine.isVaccinated('case-rescued-888')).toBe(true);
    });
  });
});
