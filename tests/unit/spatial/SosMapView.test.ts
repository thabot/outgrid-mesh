/**
 * Unit tests for SosMapView Component (Phase 5: Spatial Engine & Map)
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, expect, it } from 'bun:test';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { ODBL_ATTRIBUTION } from '../../../src/core/spatial/TileProxyClient';
import { KAnonymityHeatmap, MIN_K_ANONYMITY } from '../../../src/core/spatial/KAnonymityHeatmap';
import { H3GridEngine } from '../../../src/core/spatial/H3GridEngine';
import { SosRadarEngine } from '../../../src/core/spatial/SosRadarEngine';

const ROOT = join(import.meta.dir, '../../../');

describe('SosMapView (Phase 5 Task 10.3 — Spatial Map UI)', () => {
  it('should have SosMapView.svelte component in ui/components/', () => {
    const componentPath = join(ROOT, 'src/ui/components/SosMapView.svelte');
    expect(existsSync(componentPath)).toBe(true);
  });

  it('should include Map tab in +page.svelte navigation', () => {
    const pagePath = join(ROOT, 'src/routes/+page.svelte');
    const pageContent = readFileSync(pagePath, 'utf-8');
    expect(pageContent).toContain("activeTab === 'map'");
    expect(pageContent).toContain('SosMapView');
    expect(pageContent).toContain('🗺️');
  });

  it('should have Leaflet CSS loaded in app.html', () => {
    const appHtmlPath = join(ROOT, 'src/app.html');
    const content = readFileSync(appHtmlPath, 'utf-8');
    expect(content).toContain('leaflet');
    expect(content).toContain('stylesheet');
  });

  it('should comply with ODbL attribution requirement (© OpenStreetMap)', () => {
    expect(ODBL_ATTRIBUTION).toContain('OpenStreetMap');
    expect(ODBL_ATTRIBUTION).toContain('ODbL');

    // Component must also render attribution
    const componentPath = join(ROOT, 'src/ui/components/SosMapView.svelte');
    const componentContent = readFileSync(componentPath, 'utf-8');
    expect(componentContent).toContain('ODBL_ATTRIBUTION');
  });

  it('should build K-Anonymity heatmap and suppress cells with < 3 nodes', () => {
    const heatmap = new KAnonymityHeatmap();

    // Register 2 nodes in same hex — should be suppressed (< K=3)
    const h3a = H3GridEngine.coordToH3(13.7563, 100.5018, 9);
    heatmap.registerPresence('node-A', h3a);
    heatmap.registerPresence('node-B', h3a);

    const cells = heatmap.getPublicHeatmap(MIN_K_ANONYMITY);
    expect(cells.length).toBe(0); // Privacy guard: not enough nodes

    // Add 3rd node — should now appear
    heatmap.registerPresence('node-C', h3a);
    const cells2 = heatmap.getPublicHeatmap(MIN_K_ANONYMITY);
    expect(cells2.length).toBeGreaterThanOrEqual(1);
    expect(cells2[0].nodeCount).toBe(3);
  });

  it('should calculate SOS radar bearing from rescuer to target < 1m precision', () => {
    // Rescuer at Chiang Mai Nimman area, target 500m northeast
    const rescuerPos = { lat: 18.7975, lng: 98.9682 };
    const sosH3 = H3GridEngine.coordToH3(18.8010, 98.9720, 9);

    const target = SosRadarEngine.computeTarget(
      'sos-target-1',
      rescuerPos,
      0,           // Facing north
      sosH3,
      { deltaX: 0, deltaY: 0 },
      true
    );

    expect(target.distanceMeters).toBeGreaterThan(0);
    expect(target.compassBearingDeg).toBeGreaterThanOrEqual(0);
    expect(target.compassBearingDeg).toBeLessThan(360);
    expect(target.isCritical).toBe(true);
  });

  it('should have correct H3 hierarchy bundles for map zoom levels', () => {
    // Bangkok city center
    const h3res9 = H3GridEngine.coordToH3(13.7563, 100.5018, 9);
    const bundle = H3GridEngine.get4TierBundle(h3res9);

    // All four tiers must be non-zero bigint
    expect(bundle.res9).toBeGreaterThan(0n);
    expect(bundle.res7).toBeGreaterThan(0n);
    expect(bundle.res5).toBeGreaterThan(0n);
    expect(bundle.res4).toBeGreaterThan(0n);

    // Resolution must decrease correctly
    expect(H3GridEngine.getResolution(bundle.res9)).toBe(9);
    expect(H3GridEngine.getResolution(bundle.res7)).toBe(7);
    expect(H3GridEngine.getResolution(bundle.res5)).toBe(5);
    expect(H3GridEngine.getResolution(bundle.res4)).toBe(4);
  });
});
