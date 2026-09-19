/**
 * Unit tests for DualTierSpatialPrivacy
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, it, expect } from 'bun:test';
import { DualTierSpatialPrivacy, type INodeLocationRecord } from '../../../cloudflare/workers/spatialPrivacy';
import { UserRole } from '../../../src/core/auth/AuthManager';

describe('DualTierSpatialPrivacy (Public Res 7 vs Responder Res 9)', () => {
  const records: INodeLocationRecord[] = [
    {
      nodeId: 'victim-01',
      res9Cell: '8928308280fffff',
      deltaX: 12,
      deltaY: -35,
      isSosActive: true,
    },
    {
      nodeId: 'victim-02',
      res9Cell: '8928308280bffff',
      deltaX: 45,
      deltaY: 10,
      isSosActive: false,
    },
  ];

  it('should mask detailed locations and aggregate into H3 Res 7 for Guest users', () => {
    const result = DualTierSpatialPrivacy.filterLocations(records, UserRole.GUEST_VICTIM);

    expect(result.detailedLocations).toBeUndefined();
    expect(result.publicHeatmap).toBeDefined();
    expect(result.publicHeatmap?.length).toBeGreaterThan(0);
    expect(result.publicHeatmap![0].hasActiveSos).toBe(true);
    expect(result.publicHeatmap![0].clusterCount).toBe(2);
  });

  it('should deliver rooftop Res 9 and delta coordinates to Verified Responders', () => {
    const result = DualTierSpatialPrivacy.filterLocations(records, UserRole.VERIFIED_RESPONDER);

    expect(result.publicHeatmap).toBeUndefined();
    expect(result.detailedLocations).toBeDefined();
    expect(result.detailedLocations?.length).toBe(2);

    const victim1 = result.detailedLocations!.find(v => v.nodeId === 'victim-01');
    expect(victim1?.deltaX).toBe(12);
    expect(victim1?.deltaY).toBe(-35);
    expect(victim1?.isSosActive).toBe(true);
  });
});
