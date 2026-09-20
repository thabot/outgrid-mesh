<script lang="ts">
  /**
   * SOS Map View — OpenStreetMap + H3 Hexagon Heatmap + SOS Radar Overlay
   * Creator & Lead Architect: Thabot <thabo47@gmail.com>
   * Protocol: TOG v1.1 Phase 5 (Spatial Engine & Map)
   * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
   */
  import { onMount, onDestroy } from 'svelte';
  import type { Map as LeafletMap, LatLng } from 'leaflet';
  import { KAnonymityHeatmap } from '../../core/spatial/KAnonymityHeatmap';
  import { H3GridEngine } from '../../core/spatial/H3GridEngine';
  import { ODBL_ATTRIBUTION } from '../../core/spatial/TileProxyClient';

  // --------------- Props ---------------
  export let sosTargets: Array<{
    id: string;
    lat: number;
    lng: number;
    category: string;
    distanceMeters?: number;
  }> = [];

  // --------------- State ---------------
  let mapEl: HTMLDivElement;
  let map: LeafletMap | null = null;
  let L: typeof import('leaflet') | null = null;
  let hexLayers: any[] = [];
  let sosMarkers: any[] = [];
  let myMarker: any = null;
  let myPos: { lat: number; lng: number } | null = null;
  let isLocating = false;
  let locationError = '';
  let heatmap = new KAnonymityHeatmap();

  // Demo seed data: 10 simulated mesh nodes in Bangkok/flood zone area
  const DEMO_NODES: Array<{ id: string; lat: number; lng: number }> = [
    { id: 'node-1', lat: 13.756, lng: 100.501 },
    { id: 'node-2', lat: 13.757, lng: 100.503 },
    { id: 'node-3', lat: 13.755, lng: 100.499 },
    { id: 'node-4', lat: 13.760, lng: 100.510 },
    { id: 'node-5', lat: 13.761, lng: 100.512 },
    { id: 'node-6', lat: 13.758, lng: 100.507 },
    { id: 'node-7', lat: 13.754, lng: 100.502 },
    { id: 'node-8', lat: 13.752, lng: 100.498 },
    { id: 'node-9', lat: 13.763, lng: 100.515 },
    { id: 'node-10', lat: 13.762, lng: 100.514 },
    // Chiangmai flood zone cluster
    { id: 'node-11', lat: 18.789, lng: 98.986 },
    { id: 'node-12', lat: 18.790, lng: 98.988 },
    { id: 'node-13', lat: 18.788, lng: 98.984 },
    { id: 'node-14', lat: 18.792, lng: 98.990 },
    { id: 'node-15', lat: 18.787, lng: 98.983 },
  ];

  // Density colour mapping
  const DENSITY_COLOR: Record<string, string> = {
    low: '#22c55e',      // green — safe zone
    medium: '#f59e0b',   // amber — moderate density
    high: '#ef4444',     // red — crisis hotspot
  };

  async function initMap() {
    // Dynamic import to avoid SSR issues
    L = (await import('leaflet')) as typeof import('leaflet');
    // Fix default marker icon paths — use locally bundled assets (no CDN required)
    // @ts-ignore
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: '/_vendor/marker-icon-2x.png',
      iconUrl: '/_vendor/marker-icon.png',
      shadowUrl: '/_vendor/marker-shadow.png',
    });

    map = L.map(mapEl, {
      center: [13.7563, 100.5018], // Bangkok default
      zoom: 12,
      zoomControl: true,
    });

    // OpenStreetMap tile layer — ODbL compliant
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: ODBL_ATTRIBUTION,
    }).addTo(map);

    // Seed heatmap with demo nodes
    for (const node of DEMO_NODES) {
      const h3Idx = H3GridEngine.coordToH3(node.lat, node.lng, 9);
      heatmap.registerPresence(node.id, h3Idx);
    }

    renderHexHeatmap();
    renderSosTargets();
  }

  function renderHexHeatmap() {
    if (!L || !map) return;

    // Remove old hex layers
    for (const layer of hexLayers) layer.remove();
    hexLayers = [];

    const cells = heatmap.getPublicHeatmap(3);
    const { cellToBoundary } = getH3Functions();

    for (const cell of cells) {
      try {
        const boundary = cellToBoundary(cell.h3ParentRes7);
        const latLngs = boundary.map(([lat, lng]: [number, number]) => [lat, lng] as [number, number]);
        const color = DENSITY_COLOR[cell.densityLevel] ?? '#22c55e';

        const poly = L!.polygon(latLngs, {
          color,
          fillColor: color,
          fillOpacity: cell.densityLevel === 'high' ? 0.45 : cell.densityLevel === 'medium' ? 0.3 : 0.18,
          weight: 1.5,
          opacity: 0.7,
        }).addTo(map!);

        poly.bindTooltip(
          `📡 ${cell.nodeCount} โหนด (${cell.densityLevel === 'high' ? '🔴 หนาแน่น' : cell.densityLevel === 'medium' ? '🟡 ปานกลาง' : '🟢 เบาบาง'})`,
          { direction: 'top', sticky: true }
        );

        hexLayers.push(poly);
      } catch {
        // Skip invalid H3 cells silently
      }
    }
  }

  function renderSosTargets() {
    if (!L || !map) return;

    for (const m of sosMarkers) m.remove();
    sosMarkers = [];

    for (const target of sosTargets) {
      const sosIcon = L!.divIcon({
        html: `<div class="sos-pin" title="${target.category}">🚨</div>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L!.marker([target.lat, target.lng], { icon: sosIcon })
        .addTo(map!)
        .bindPopup(
          `<b>🚨 SOS: ${target.category}</b><br>` +
          (target.distanceMeters ? `📏 ระยะห่าง: ~${target.distanceMeters} เมตร` : '') +
          `<br><small style="color:#94a3b8">ID: ${target.id}</small>`
        );
      sosMarkers.push(marker);
    }
  }

  function locateMe() {
    if (!map || !L || isLocating) return;
    isLocating = true;
    locationError = '';

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        isLocating = false;
        myPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };

        if (myMarker) myMarker.remove();
        const meIcon = L!.divIcon({
          html: `<div class="me-pin">📍</div>`,
          className: '',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
        myMarker = L!.marker([myPos.lat, myPos.lng], { icon: meIcon })
          .addTo(map!)
          .bindPopup('<b>📍 ตำแหน่งของคุณ</b>')
          .openPopup();

        // Register self in heatmap
        const h3Idx = H3GridEngine.coordToH3(myPos.lat, myPos.lng, 9);
        heatmap.registerPresence('self', h3Idx);
        renderHexHeatmap();

        map!.flyTo([myPos.lat, myPos.lng], 14, { animate: true, duration: 1.5 });
      },
      (err) => {
        isLocating = false;
        locationError = 'ไม่สามารถระบุตำแหน่ง: ' + err.message;
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // Lazy-load h3-js cellToBoundary
  function getH3Functions() {
    // Access h3-js globally via import (already imported at module level in H3GridEngine)
    // We call the function from h3-js directly
    const h3 = (globalThis as any).__h3__ ?? {};
    return h3;
  }

  onMount(async () => {
    // Dynamically import h3-js cellToBoundary and attach globally for use in getH3Functions
    const h3module = await import('h3-js');
    (globalThis as any).__h3__ = h3module;
    await initMap();
  });

  onDestroy(() => {
    if (map) {
      map.remove();
      map = null;
    }
  });

  // Reactively re-render SOS targets when prop changes
  $: if (map && L) renderSosTargets();
</script>

<div class="mapview-root">
  <!-- Toolbar -->
  <div class="map-toolbar">
    <div class="toolbar-left">
      <span class="map-title">🗺️ OutGrid Map</span>
      <span class="badge-osm">© OpenStreetMap</span>
    </div>
    <div class="toolbar-right">
      <button class="btn-locate" class:locating={isLocating} on:click={locateMe} disabled={isLocating}>
        {isLocating ? '📡 กำลังหาตำแหน่ง...' : '📍 หาตำแหน่งของฉัน'}
      </button>
    </div>
  </div>

  {#if locationError}
    <div class="location-error">⚠️ {locationError}</div>
  {/if}

  <!-- Legend -->
  <div class="map-legend">
    <span class="legend-item"><span class="dot" style="background:#22c55e"></span> โหนดเบาบาง</span>
    <span class="legend-item"><span class="dot" style="background:#f59e0b"></span> โหนดปานกลาง</span>
    <span class="legend-item"><span class="dot" style="background:#ef4444"></span> โหนดหนาแน่น</span>
    <span class="legend-item">🚨 จุด SOS</span>
    <span class="legend-item">📍 ตำแหน่งคุณ</span>
  </div>

  <!-- Map Container -->
  <div bind:this={mapEl} class="map-container"></div>

  <!-- Attribution footer -->
  <div class="attribution-footer">
    {ODBL_ATTRIBUTION}
  </div>
</div>

<style>
  .mapview-root {
    display: flex;
    flex-direction: column;
    gap: 0;
    height: 100%;
    min-height: 520px;
  }

  .map-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.6rem 1rem;
    background: #0f172a;
    border-bottom: 1px solid #1e293b;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .map-title {
    font-size: 1rem;
    font-weight: 700;
    color: #38bdf8;
  }

  .badge-osm {
    font-size: 0.7rem;
    background: #1e293b;
    color: #64748b;
    padding: 2px 8px;
    border-radius: 9999px;
  }

  .btn-locate {
    background: #0ea5e9;
    color: #fff;
    border: none;
    padding: 0.4rem 0.9rem;
    border-radius: 0.5rem;
    font-size: 0.85rem;
    cursor: pointer;
    font-weight: 600;
    transition: background 0.2s;
  }
  .btn-locate:hover:not(:disabled) {
    background: #0284c7;
  }
  .btn-locate:disabled,
  .btn-locate.locating {
    background: #334155;
    cursor: wait;
  }

  .location-error {
    background: #450a0a;
    color: #fca5a5;
    font-size: 0.8rem;
    padding: 0.4rem 1rem;
  }

  .map-legend {
    display: flex;
    gap: 1rem;
    padding: 0.4rem 1rem;
    background: #0f172a;
    border-bottom: 1px solid #1e293b;
    flex-wrap: wrap;
    font-size: 0.75rem;
    color: #94a3b8;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }

  .dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }

  .map-container {
    flex: 1;
    min-height: 420px;
    z-index: 0;
  }

  .attribution-footer {
    font-size: 0.65rem;
    color: #475569;
    padding: 0.3rem 1rem;
    background: #0a0f1e;
    text-align: right;
  }

  :global(.sos-pin) {
    font-size: 24px;
    line-height: 1;
    filter: drop-shadow(0 0 6px rgba(239, 68, 68, 0.8));
    animation: sos-pulse 1.2s infinite;
  }

  :global(.me-pin) {
    font-size: 24px;
    line-height: 1;
  }

  @keyframes sos-pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.25); }
  }
</style>
