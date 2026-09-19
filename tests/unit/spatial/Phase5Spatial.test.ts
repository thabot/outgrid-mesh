/**
 * Unit tests for Phase 5 Spatial H3 Indexing, Hierarchical Fallback & Supernode Election
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, expect, it } from 'bun:test';
import { H3GridEngine } from '../../../src/core/spatial/H3GridEngine';
import { SpatialExpansionEngine, SpatialExpansionTier } from '../../../src/core/spatial/SpatialExpansionEngine';
import { SupernodeElection, NodeRole } from '../../../src/core/mesh/SupernodeElection';

describe('Phase 5: Spatial H3 Indexing, Hierarchical Fallback & Supernode Election', () => {
  describe('Task 5.1: Spatial H3 Grid & Geo-Hashing Engine (4-Tier Architecture)', () => {
    it('should convert GPS coordinates to H3 Index across 4 hierarchical tiers (Res 9, 7, 5, 4)', () => {
      // Bangkok Grand Palace coordinates
      const lat = 13.7500;
      const lng = 100.4914;

      const h3Res9 = H3GridEngine.coordToH3(lat, lng, 9);
      expect(typeof h3Res9).toBe('bigint');
      expect(H3GridEngine.getResolution(h3Res9)).toBe(9);

      // Extract 4-tier bundle
      const bundle = H3GridEngine.get4TierBundle(h3Res9);
      expect(bundle.res9).toBe(h3Res9);
      expect(H3GridEngine.getResolution(bundle.res7)).toBe(7);
      expect(H3GridEngine.getResolution(bundle.res5)).toBe(5);
      expect(H3GridEngine.getResolution(bundle.res4)).toBe(4);

      // Verify reverse coordinate mapping within cell bounds
      const coord = H3GridEngine.h3ToCoord(h3Res9);
      expect(Math.abs(coord.lat - lat)).toBeLessThan(0.01);
      expect(Math.abs(coord.lng - lng)).toBeLessThan(0.01);
    });
  });

  describe('Task 5.2: Progressive Spatial Expansion & K-Ring Search when Offline', () => {
    it('should expand search scope through Tiers 1 to 4 as offline duration increases', () => {
      const h3Res9 = H3GridEngine.coordToH3(13.7500, 100.4914, 9);

      // 1. < 15 min -> Tier 1 (Res 9, 1 cell)
      const scope1 = SpatialExpansionEngine.computeScope(h3Res9, 10 * 60 * 1000);
      expect(scope1.tier).toBe(SpatialExpansionTier.TIER_1_RES9);
      expect(scope1.resolution).toBe(9);
      expect(scope1.targetCells.length).toBe(1);

      // 2. 15 min to 2 hours -> Tier 2 (Res 7, gridDisk k=1 = 7 cells)
      const scope2 = SpatialExpansionEngine.computeScope(h3Res9, 45 * 60 * 1000);
      expect(scope2.tier).toBe(SpatialExpansionTier.TIER_2_RES7);
      expect(scope2.resolution).toBe(7);
      expect(scope2.targetCells.length).toBe(7);

      // 3. 2 hours to 12 hours -> Tier 3 (Res 5, 1 cell)
      const scope3 = SpatialExpansionEngine.computeScope(h3Res9, 4 * 60 * 60 * 1000);
      expect(scope3.tier).toBe(SpatialExpansionTier.TIER_3_RES5);
      expect(scope3.resolution).toBe(5);
      expect(scope3.targetCells.length).toBe(1);

      // 4. > 12 hours -> Tier 4 (Res 4 Data Mule)
      const scope4 = SpatialExpansionEngine.computeScope(h3Res9, 18 * 60 * 60 * 1000);
      expect(scope4.tier).toBe(SpatialExpansionTier.TIER_4_RES4);
      expect(scope4.resolution).toBe(4);
      expect(scope4.targetCells.length).toBe(1);

      // 5. Instant Collapse upon Signed ACK
      const collapsed = SpatialExpansionEngine.collapseToDirect(h3Res9);
      expect(collapsed.tier).toBe(SpatialExpansionTier.TIER_1_RES9);
      expect(collapsed.resolution).toBe(9);
      expect(collapsed.targetCells[0]).toBe(h3Res9);
    });
  });

  describe('Task 5.3: Deterministic Supernode Election Algorithm & LoRa Gateway Promotion', () => {
    it('should promote node with LoRa Companion Bridge to Tier-1 Backbone Gateway', () => {
      const loraNode = {
        nodeId: 'lora-bridge-01',
        batteryLevel: 60,
        isCharging: false,
        hasLoraGateway: true,
        availableRamMb: 2048,
        linkStabilityScore: 95,
        h3ZoneRes7: 0x87654c5525fffff0n
      };

      const score = SupernodeElection.calculateFitnessScore(loraNode);
      expect(score).toBeGreaterThanOrEqual(100);

      const role = SupernodeElection.evaluateRole(loraNode, 1);
      expect(role).toBe(NodeRole.TIER1_LORA_BACKBONE_GATEWAY);
    });

    it('should elect Master and Standby Supernodes based on zone rank and demote low battery', () => {
      const goodPhone = {
        nodeId: 'phone-01',
        batteryLevel: 85,
        isCharging: true,
        hasLoraGateway: false,
        availableRamMb: 4096,
        linkStabilityScore: 90,
        h3ZoneRes7: 0x87654c5525fffff0n
      };

      // Rank 1 -> ZONE_MASTER_SUPERNODE
      expect(SupernodeElection.evaluateRole(goodPhone, 1)).toBe(NodeRole.ZONE_MASTER_SUPERNODE);
      // Rank 2 -> STANDBY_SUPERNODE
      expect(SupernodeElection.evaluateRole(goodPhone, 2)).toBe(NodeRole.STANDBY_SUPERNODE);

      // Low battery (< 30% and not charging) -> Demoted to NORMAL_PEER
      const dyingPhone = {
        ...goodPhone,
        batteryLevel: 25,
        isCharging: false
      };
      expect(SupernodeElection.evaluateRole(dyingPhone, 1)).toBe(NodeRole.NORMAL_PEER);
    });
  });
});
