<script lang="ts">
  /**
   * SOS Map View — OpenStreetMap + H3 Hexagon Heatmap + SOS Radar Overlay
   * Creator & Lead Architect: Thabot <thabo47@gmail.com>
   * Protocol: TOG v1.1 Phase 5 (Spatial Engine & Map)
   * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
   */
  import { onMount, onDestroy } from 'svelte';
  import { base } from '$app/paths';
  import type { Map as LeafletMap, LatLng } from 'leaflet';
  import { KAnonymityHeatmap } from '../../core/spatial/KAnonymityHeatmap';
  import { H3GridEngine } from '../../core/spatial/H3GridEngine';
  import { ODBL_ATTRIBUTION } from '../../core/spatial/TileProxyClient';
  import { peerDiscoveryManager } from '../../core/state/PeerDiscoveryStore';

  // --------------- Props ---------------
  export let sosTargets: Array<{
    id: string;
    lat: number;
    lng: number;
    category: string;
    distanceMeters?: number;
  }> = [];

  export let peerNodes: Array<{
    shortNodeId: string;
    lat: number;
    lng: number;
    batteryBars: number; // 1 to 5 bars
    rssiTier: number;    // 0 to 3
    distanceMeters: number;
  }> = [];

  export let showPeerDistance: boolean = true;
  export let showAllNodes: boolean = true;

  import { getBatteryBarsVisual } from '../../core/battery/BatteryRuntimeEstimator';

  // --------------- State ---------------
  let mapEl: HTMLDivElement;
  let map: LeafletMap | null = null;
  let L: typeof import('leaflet') | null = null;
  let hexLayers: any[] = [];
  let sosMarkers: any[] = [];
  let peerMarkers: any[] = [];
  let myMarker: any = null;
  let myPos: { lat: number; lng: number } | null = null;
  let isLocating = false;
  let locationError = '';
  let heatmap = new KAnonymityHeatmap();
  let basemapLayer: any = null;
  let isBasemapLoaded = false;
  let isOfflineMode = false;

  // Density colour mapping
  const DENSITY_COLOR: Record<string, string> = {
    low: '#22c55e',      // green — safe zone
    medium: '#f59e0b',   // amber — moderate density
    high: '#ef4444',     // red — crisis hotspot
  };

  async function initMap() {
    // Dynamic import to avoid SSR issues
    L = (await import('leaflet')) as typeof import('leaflet');
    try {
      await import('leaflet/dist/leaflet.css');
    } catch {
      // Fallback if bundler handles css separately
    }
    // Fix default marker icon paths — use locally bundled assets (no CDN required)
    // @ts-ignore
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: '/assets/_vendor/marker-icon-2x.png',
      iconUrl: '/assets/_vendor/marker-icon.png',
      shadowUrl: '/assets/_vendor/marker-shadow.png',
    });

    map = L.map(mapEl, {
      center: [13.7563, 100.5018], // Bangkok default
      zoom: 12,
      zoomControl: true,
    });

    // OpenStreetMap tile layer with offline fallback handling
    const osmTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: ODBL_ATTRIBUTION,
    });

    osmTileLayer.on('tileerror', (event: any) => {
      // Offline fallback: hide missing tile box and reveal tactical grid
      if (event.tile) {
        event.tile.style.display = 'none';
      }
    });

    osmTileLayer.addTo(map);

    // Load offline World Basemap L2
    await loadWorldBasemapL2();

    renderHexHeatmap();
    renderSosTargets();
  }

  async function loadWorldBasemapL2() {
    if (!map || !L) return;
    try {
      const resp = await fetch(`${base}/data/world_basemap_l2.json`);
      if (!resp.ok) return;
      const geoJson = await resp.json();

      if (basemapLayer) basemapLayer.remove();

      basemapLayer = L.geoJSON(geoJson, {
        style: (feature: any) => {
          const layerType = feature?.properties?.layer;
          if (layerType === 'country') {
            return { color: '#0284c7', weight: 1.5, fillOpacity: 0.02, fillColor: '#38bdf8', opacity: 0.4 };
          } else if (layerType === 'state') {
            return { color: '#38bdf8', weight: 1, dashArray: '4, 4', fillOpacity: 0.01, opacity: 0.35 };
          } else if (layerType === 'river') {
            return { color: '#0ea5e9', weight: 1.5, opacity: 0.5 };
          }
          return { color: '#64748b', weight: 0.8, opacity: 0.3 };
        },
        pointToLayer: (feature: any, latlng: any) => {
          return L!.circleMarker(latlng, {
            radius: 3.5,
            fillColor: '#f59e0b',
            color: '#ffffff',
            weight: 1,
            opacity: 0.8,
            fillOpacity: 0.7,
          }).bindTooltip(`🏙️ ${feature?.properties?.name || 'City'}`, { direction: 'top' });
        }
      }).addTo(map);

      isBasemapLoaded = true;
    } catch (err) {
      console.warn('World Basemap L2 offline load skipped:', err);
    }
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

  function renderPeerNodes() {
    if (!L || !map) return;

    for (const m of peerMarkers) m.remove();
    peerMarkers = [];

    if (!showAllNodes) return;

    for (const peer of peerNodes) {
      const batVisual = getBatteryBarsVisual(peer.batteryBars);
      const distStr = showPeerDistance ? `~${peer.distanceMeters} ม.` : '';
      const peerHtml = `
        <div class="peer-pin" style="border-color: ${batVisual.color};">
          <span class="peer-dot" style="background: ${batVisual.color};"></span>
          <span class="peer-label">${peer.shortNodeId}</span>
          ${distStr ? `<span class="peer-dist">${distStr}</span>` : ''}
        </div>
      `;

      const peerIcon = L!.divIcon({
        html: peerHtml,
        className: 'peer-icon-wrapper',
        iconSize: [80, 36],
        iconAnchor: [40, 18],
      });

      const popupHtml = `
        <b>📡 โหนดในรัศมีวิทยุ: ${peer.shortNodeId}</b><br>
        <span>🔋 แบตเตอรี่: ${batVisual.text} (${batVisual.percentStr})</span><br>
        <span>📶 สัญญาณ: ${peer.rssiTier === 3 ? '🟢 แรงมาก' : peer.rssiTier === 2 ? '🟡 ดี' : peer.rssiTier === 1 ? '🟠 ปานกลาง' : '🔴 อ่อน'}</span><br>
        ${showPeerDistance ? `<span>📏 ระยะห่างโดยประมาณ: ~${peer.distanceMeters} เมตร</span>` : ''}
      `;

      const marker = L!.marker([peer.lat, peer.lng], { icon: peerIcon })
        .addTo(map!)
        .bindPopup(popupHtml);

      peerMarkers.push(marker);
    }
  }

  let watchId: number | null = null;

  function locateMe(isAutoTrigger = false) {
    if (!map || !L || isLocating) return;
    if (!navigator.geolocation) {
      locationError = 'อุปกรณ์หรือเบราว์เซอร์นี้ไม่รองรับการระบุพิกัด GPS';
      return;
    }

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
          .bindPopup('<b>📍 ตำแหน่งของคุณ</b><br><small>GPS แม่นยำ: ±' + Math.round(pos.coords.accuracy) + ' เมตร</small>')
          .openPopup();

        // Register self in heatmap
        const h3Idx = H3GridEngine.coordToH3(myPos.lat, myPos.lng, 9);
        heatmap.registerPresence('self', h3Idx);
        renderHexHeatmap();

        // Update central PeerDiscoveryStore with real user GPS coordinates
        peerDiscoveryManager.setUserLocation(myPos.lat, myPos.lng);

        map!.flyTo([myPos.lat, myPos.lng], 15, { animate: true, duration: 1.5 });

        // Start continuous live tracking if not already active
        startLiveTracking();
      },
      (err) => {
        isLocating = false;
        if (err.code === err.PERMISSION_DENIED) {
          locationError = 'เบราว์เซอร์ถูกปฏิเสธการเข้าถึงตำแหน่ง กรุณาแตะที่ไอคอนแม่กุญแจ/การตั้งค่าของเบราว์เซอร์ แล้วเลือก "อนุญาตการเข้าถึงตำแหน่ง" (Allow Location)';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          locationError = 'สัญญาณ GPS ไม่พร้อมใช้งานในขณะนี้';
        } else if (err.code === err.TIMEOUT) {
          locationError = 'หมดเวลาการค้นหาสัญญาณ GPS กรุณากดลองใหม่อีกครั้ง';
        } else {
          locationError = 'ไม่สามารถระบุตำแหน่ง: ' + err.message;
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 }
    );
  }

  function startLiveTracking() {
    if (watchId !== null || !navigator.geolocation) return;
    try {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          myPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          if (myMarker && map) {
            myMarker.setLatLng([myPos.lat, myPos.lng]);
          }
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000 }
      );
    } catch {
      // Ignore watchPosition errors
    }
  }

  // Lazy-load h3-js cellToBoundary
  function getH3Functions() {
    const h3 = (globalThis as any).__h3__ ?? {};
    return h3;
  }

  onMount(async () => {
    // Dynamically import h3-js cellToBoundary and attach globally for use in getH3Functions
    const h3module = await import('h3-js');
    (globalThis as any).__h3__ = h3module;
    await initMap();

    // Auto-request location immediately upon opening map view
    locateMe(true);
  });

  onDestroy(() => {
    if (watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    if (map) {
      map.remove();
      map = null;
    }
  });

  // Reactively re-render SOS targets and Peer nodes when props or toggle states change
  $: if (map && L) {
    renderSosTargets();
    renderPeerNodes();
  }
</script>

<div class="mapview-root">
  <!-- Toolbar -->
  <div class="map-toolbar">
    <div class="toolbar-left">
      <span class="map-title">🗺️ OutGrid Map</span>
      <span class="badge-osm">© OpenStreetMap</span>
      {#if isBasemapLoaded}
        <span class="badge-basemap" title="World Vector Basemap Level 2 ออฟไลน์ติดเครื่อง 100%">🌍 Basemap L2</span>
      {/if}
    </div>
    <div class="toolbar-right">
      <button
        class="btn-control"
        class:active={showAllNodes}
        on:click={() => showAllNodes = !showAllNodes}
        title="สลับแสดงเฉพาะจุด SOS หรือโหนดทั้งหมดในรัศมีวิทยุ"
      >
        {showAllNodes ? '🌐 โหนดทั้งหมด' : '🚨 เฉพาะ SOS'}
      </button>

      <button
        class="btn-control"
        class:active={showPeerDistance}
        on:click={() => showPeerDistance = !showPeerDistance}
        title="เปิด/ปิดการแสดงระยะทางบนหมุดโหนด"
      >
        {showPeerDistance ? '📏 ซ่อนระยะ' : '📏 แสดงระยะ'}
      </button>

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
    <span class="legend-item">🔋 แบตเตอรี่เพื่อน 5 ขีด</span>
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

  .badge-basemap {
    font-size: 0.7rem;
    background: #0284c7;
    color: #ffffff;
    padding: 2px 8px;
    border-radius: 9999px;
    font-weight: 600;
  }

  .btn-control {
    background: #1e293b;
    color: #94a3b8;
    border: 1px solid #334155;
    padding: 0.35rem 0.75rem;
    border-radius: 0.375rem;
    font-size: 0.8rem;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.15s ease;
  }
  .btn-control:hover {
    background: #334155;
    color: #f1f5f9;
  }
  .btn-control.active {
    background: #0369a1;
    color: #ffffff;
    border-color: #38bdf8;
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

  :global(.peer-icon-wrapper) {
    background: transparent !important;
    border: none !important;
  }

  :global(.peer-pin) {
    display: flex;
    align-items: center;
    gap: 4px;
    background: rgba(15, 23, 42, 0.9);
    color: #f8fafc;
    border: 1.5px solid #22c55e;
    border-radius: 9999px;
    padding: 2px 6px;
    font-size: 11px;
    font-weight: 700;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
    white-space: nowrap;
  }

  :global(.peer-dot) {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    display: inline-block;
  }

  :global(.peer-label) {
    color: #38bdf8;
  }

  :global(.peer-dist) {
    color: #94a3b8;
    font-size: 9px;
    font-weight: 500;
  }

  @keyframes sos-pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.25); }
  }

  /* Global Leaflet Engine & Tile Layer Overrides */
  :global(.map-container.leaflet-container) {
    width: 100% !important;
    height: 100% !important;
    background-color: #0b132b !important;
    background-image: 
      linear-gradient(rgba(56, 189, 248, 0.08) 1px, transparent 1px),
      linear-gradient(90deg, rgba(56, 189, 248, 0.08) 1px, transparent 1px),
      radial-gradient(circle at center, rgba(14, 165, 233, 0.12) 0%, transparent 70%) !important;
    background-size: 40px 40px, 40px 40px, 100% 100% !important;
    outline: none !important;
  }

  :global(.leaflet-tile-pane) {
    z-index: 200 !important;
  }

  :global(.leaflet-tile) {
    filter: brightness(0.85) contrast(1.15) !important;
    opacity: 1 !important;
    visibility: visible !important;
  }

  :global(.leaflet-overlay-pane) {
    z-index: 400 !important;
  }

  :global(.leaflet-marker-pane) {
    z-index: 600 !important;
  }
</style>
