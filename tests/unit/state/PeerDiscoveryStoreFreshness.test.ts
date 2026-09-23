/**
 * Unit Test Suite for PeerDiscoveryStore Freshness, Intervals, Pruning & Stealth Mode
 * Protocol: TOG v1.1 State & Spatial Mesh
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateBroadcastInterval,
  isStealthModeStore,
  setStealthMode,
  toggleStealthMode,
  peerDiscoveryManager
} from '../../../src/core/state/PeerDiscoveryStore';

describe('PeerDiscoveryStore Freshness & State Suite', () => {
  describe('Adaptive Broadcast Interval Calculation', () => {
    it('should return 8000ms for <= 5 active peers', () => {
      expect(calculateBroadcastInterval(0)).toBe(8000);
      expect(calculateBroadcastInterval(5)).toBe(8000);
    });

    it('should return 15000ms for 6 to 15 active peers', () => {
      expect(calculateBroadcastInterval(6)).toBe(15000);
      expect(calculateBroadcastInterval(15)).toBe(15000);
    });

    it('should return 30000ms for 16 to 30 active peers', () => {
      expect(calculateBroadcastInterval(16)).toBe(30000);
      expect(calculateBroadcastInterval(30)).toBe(30000);
    });

    it('should return 60000ms for > 30 active peers', () => {
      expect(calculateBroadcastInterval(31)).toBe(60000);
      expect(calculateBroadcastInterval(100)).toBe(60000);
    });
  });

  describe('Stealth Mode Store Controls', () => {
    it('should toggle and set stealth mode store properly', () => {
      setStealthMode(false);
      let val = false;
      const unsub = isStealthModeStore.subscribe(v => { val = v; });

      expect(val).toBe(false);

      setStealthMode(true);
      expect(val).toBe(true);

      toggleStealthMode();
      expect(val).toBe(false);

      unsub();
    });
  });

  describe('45-Minute Auto-Pruning & Protection Rules', () => {
    it('should prune inactive peers older than 45 minutes while protecting Friends and SOS', () => {
      const now = Date.now();
      const storeMap = peerDiscoveryManager.getStore();

      storeMap.set(new Map([
        ['#1111', { shortNodeId: '#1111', lat: 13.7, lng: 100.5, batteryBars: 4, rssiTier: 2, distanceMeters: 50, lastSeen: now - (46 * 60 * 1000) }], // Expired
        ['#2222', { shortNodeId: '#2222', lat: 13.7, lng: 100.5, batteryBars: 4, rssiTier: 2, distanceMeters: 50, lastSeen: now - (10 * 60 * 1000) }], // Fresh
        ['#3333', { shortNodeId: '#3333', lat: 13.7, lng: 100.5, batteryBars: 4, rssiTier: 2, distanceMeters: 50, lastSeen: now - (60 * 60 * 1000), isFriend: true }], // Friend (Protected)
        ['#4444', { shortNodeId: '#4444', lat: 13.7, lng: 100.5, batteryBars: 4, rssiTier: 2, distanceMeters: 50, lastSeen: now - (60 * 60 * 1000), isSos: true }] // SOS (Protected)
      ]));

      const pruned = peerDiscoveryManager.pruneExpiredPeers(now, 45 * 60 * 1000);
      expect(pruned).toBe(1);

      let currentMap: any;
      peerDiscoveryManager.getStore().subscribe(m => { currentMap = m; })();

      expect(currentMap.has('#1111')).toBe(false);
      expect(currentMap.has('#2222')).toBe(true);
      expect(currentMap.has('#3333')).toBe(true);
      expect(currentMap.has('#4444')).toBe(true);
    });
  });
});
