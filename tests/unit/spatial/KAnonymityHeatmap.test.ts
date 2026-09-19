/**
 * Unit tests for KAnonymityHeatmap (K>=3 clustering guard, Res 7 anonymization)
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, expect, it } from 'bun:test';
import { KAnonymityHeatmap, MIN_K_ANONYMITY } from '../../../src/core/spatial/KAnonymityHeatmap';
import { latLngToCell } from 'h3-js';

describe('KAnonymityHeatmap (Privacy-Preserving K>=3 Hexagon Clustering)', () => {
  it('should suppress cells with fewer than 3 nodes to protect single-user privacy', () => {
    const heatmap = new KAnonymityHeatmap();

    // 2 isolated users in Cell A
    const cellA = BigInt('0x' + latLngToCell(13.75, 100.50, 9));
    heatmap.registerPresence('user-1', cellA);
    heatmap.registerPresence('user-2', cellA);

    // With only 2 users, public heatmap must NOT expose Cell A (count < 3)
    const publicMap = heatmap.getPublicHeatmap(MIN_K_ANONYMITY);
    expect(publicMap.length).toBe(0);

    // 3rd user joins Cell A
    heatmap.registerPresence('user-3', cellA);

    // Now Cell A satisfies K >= 3 and is safe to publish
    const updatedMap = heatmap.getPublicHeatmap(MIN_K_ANONYMITY);
    expect(updatedMap.length).toBe(1);
    expect(updatedMap[0].nodeCount).toBe(3);
    expect(updatedMap[0].densityLevel).toBe('low');
  });

  it('should reflect high density when more than 20 nodes cluster in the same area', () => {
    const heatmap = new KAnonymityHeatmap();
    const cellB = BigInt('0x' + latLngToCell(13.78, 100.55, 9));

    for (let i = 1; i <= 25; i++) {
      heatmap.registerPresence(`victim-${i}`, cellB);
    }

    const publicMap = heatmap.getPublicHeatmap();
    expect(publicMap.length).toBe(1);
    expect(publicMap[0].nodeCount).toBe(25);
    expect(publicMap[0].densityLevel).toBe('high');
  });
});
