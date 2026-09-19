/**
 * Unit tests for H3HierarchyFallback (Res 9 -> Res 7 -> Res 5 spatial aggregation)
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, expect, it } from 'bun:test';
import { H3Hierarchy } from '../../../src/core/spatial/H3Hierarchy';
import { latLngToCell, getResolution } from 'h3-js';

describe('H3HierarchyFallback (Multi-Resolution Spatial Aggregation)', () => {
  it('should downscale Res 9 cell to Res 7 and Res 5 parents', () => {
    const lat = 13.7563;
    const lng = 100.5018;

    const res9Str = latLngToCell(lat, lng, 9);
    const res9BigInt = BigInt('0x' + res9Str);

    const bundle = H3Hierarchy.getHierarchyBundle(res9BigInt);

    const res7Str = bundle.res7.toString(16);
    const res5Str = bundle.res5.toString(16);

    expect(getResolution(res7Str)).toBe(7);
    expect(getResolution(res5Str)).toBe(5);
    expect(bundle.res9).toBe(res9BigInt);
  });
});
