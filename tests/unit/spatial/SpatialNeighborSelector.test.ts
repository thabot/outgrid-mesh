/**
 * Unit Test Suite for SpatialNeighborSelector Scoring & Direction-Aware Round-Robin
 * Protocol: TOG v1.1 Wire Specification & Spatial Mesh
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */
import { describe, it, expect } from 'vitest';
import {
  SpatialNeighborSelector,
  type INeighborCandidate
} from '../../../src/core/spatial/SpatialNeighborSelector';
import { H3Direction } from '../../../src/core/spatial/H3GridEngine';

describe('SpatialNeighborSelector Comprehensive Unit Test Suite', () => {
  const origin = { lat: 13.7563, lng: 100.5018 };

  describe('Priority Score Calculation & Clamping', () => {
    it('should assign highest score to BLE Coded node with strong signal and stationary flag', () => {
      const candidate: INeighborCandidate = {
        shortNodeId: 0x1001,
        lat: 13.7570,
        lng: 100.5020,
        rssi: -30,
        batteryPct: 100,
        supportsLeCodedPhy: true,
        isStationary: true,
        isFriend: true
      };
      const score = SpatialNeighborSelector.calculateScore(candidate);
      expect(score).toBe(100.0);
    });

    it('should penalize BT 4.2 Legacy nodes in scoring', () => {
      const legacy: INeighborCandidate = {
        shortNodeId: 0x1002,
        lat: 13.7570,
        lng: 100.5020,
        rssi: -70,
        batteryPct: 80,
        isLegacyBt: true
      };
      const modern: INeighborCandidate = {
        shortNodeId: 0x1003,
        lat: 13.7570,
        lng: 100.5020,
        rssi: -70,
        batteryPct: 80,
        supportsLeCodedPhy: true
      };
      expect(SpatialNeighborSelector.calculateScore(modern)).toBeGreaterThan(
        SpatialNeighborSelector.calculateScore(legacy)
      );
    });

    it('should clamp RSSI lower bound at -95 dBm and upper bound at -30 dBm', () => {
      const veryWeak: INeighborCandidate = {
        shortNodeId: 0x1004,
        lat: 13.7570,
        lng: 100.5020,
        rssi: -120,
        batteryPct: 0
      };
      const scoreWeak = SpatialNeighborSelector.calculateScore(veryWeak);
      expect(scoreWeak).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Fused Byte Bit-Packing & Unpacking (Zero-Loss Permutations)', () => {
    it('should pack and unpack all permutations of direction, battery, and rssi tier', () => {
      for (let dir = 0; dir <= 6; dir++) {
        for (let bat = 1; bat <= 5; bat++) {
          for (let rssiTier = 0; rssiTier <= 3; rssiTier++) {
            const packed = SpatialNeighborSelector.packFusedByte(dir as H3Direction, bat, rssiTier);
            const unpacked = SpatialNeighborSelector.unpackFusedByte(packed);

            expect(unpacked.direction).toBe(dir);
            expect(unpacked.batteryLevel).toBe(bat);
            expect(unpacked.rssiTier).toBe(rssiTier);
          }
        }
      }
    });
  });

  describe('500m Distance Filter & Exception Rules', () => {
    it('should accept nodes within 500m and filter out nodes beyond 500m', () => {
      const candidates: INeighborCandidate[] = [
        { shortNodeId: 0x2001, lat: 13.7565, lng: 100.5020, rssi: -60, distanceMeters: 450 },
        { shortNodeId: 0x2002, lat: 13.7650, lng: 100.5100, rssi: -80, distanceMeters: 650 }
      ];
      const result = SpatialNeighborSelector.selectRotatingNeighbors(origin, candidates);
      expect(result.neighbors.length).toBe(1);
      expect(result.neighbors[0].shortNodeId).toBe(0x2001);
    });

    it('should exempt SOS nodes from the 500m filter', () => {
      const candidates: INeighborCandidate[] = [
        { shortNodeId: 0x2003, lat: 13.7650, lng: 100.5100, rssi: -85, distanceMeters: 800, isSos: true }
      ];
      const result = SpatialNeighborSelector.selectRotatingNeighbors(origin, candidates);
      expect(result.neighbors.length).toBe(1);
      expect(result.neighbors[0].shortNodeId).toBe(0x2003);
    });

    it('should exempt Friend nodes from the 500m filter', () => {
      const candidates: INeighborCandidate[] = [
        { shortNodeId: 0x2004, lat: 13.7700, lng: 100.5200, rssi: -90, distanceMeters: 1200, isFriend: true }
      ];
      const result = SpatialNeighborSelector.selectRotatingNeighbors(origin, candidates);
      expect(result.neighbors.length).toBe(1);
      expect(result.neighbors[0].shortNodeId).toBe(0x2004);
    });
  });

  describe('Modern-First Strict Rule', () => {
    it('should filter out all BT 4.2 nodes if 5 or more Modern nodes are present', () => {
      const candidates: INeighborCandidate[] = [
        { shortNodeId: 0x3001, lat: 13.7570, lng: 100.5020, rssi: -60, distanceMeters: 100, supportsLeCodedPhy: true },
        { shortNodeId: 0x3002, lat: 13.7575, lng: 100.5025, rssi: -62, distanceMeters: 120, supportsLeCodedPhy: true },
        { shortNodeId: 0x3003, lat: 13.7580, lng: 100.5030, rssi: -64, distanceMeters: 150, supportsLeCodedPhy: true },
        { shortNodeId: 0x3004, lat: 13.7585, lng: 100.5035, rssi: -66, distanceMeters: 180, supportsLeCodedPhy: true },
        { shortNodeId: 0x3005, lat: 13.7590, lng: 100.5040, rssi: -68, distanceMeters: 200, supportsLeCodedPhy: true },
        { shortNodeId: 0x3006, lat: 13.7565, lng: 100.5019, rssi: -50, distanceMeters: 30, isLegacyBt: true } // Legacy BT
      ];
      const result = SpatialNeighborSelector.selectRotatingNeighbors(origin, candidates);
      expect(result.neighbors.length).toBe(5);
      expect(result.neighbors.some(n => n.shortNodeId === 0x3006)).toBe(false);
    });
  });

  describe('Direction-Aware Round-Robin Balancing', () => {
    it('should pick candidate representatives across different direction buckets', () => {
      const candidates: INeighborCandidate[] = [
        { shortNodeId: 0x4001, lat: 13.7600, lng: 100.5018, rssi: -60, distanceMeters: 300 }, // North
        { shortNodeId: 0x4002, lat: 13.7590, lng: 100.5060, rssi: -60, distanceMeters: 300 }, // NE
        { shortNodeId: 0x4003, lat: 13.7520, lng: 100.5018, rssi: -60, distanceMeters: 300 }, // South
        { shortNodeId: 0x4004, lat: 13.7530, lng: 100.4980, rssi: -60, distanceMeters: 300 }  // SW
      ];
      const result = SpatialNeighborSelector.selectRotatingNeighbors(origin, candidates);
      expect(result.neighbors.length).toBe(4);
      const directions = result.neighbors.map(n => n.direction);
      const uniqueDirs = new Set(directions);
      expect(uniqueDirs.size).toBe(4);
    });
  });
});
