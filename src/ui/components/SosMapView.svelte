<script lang="ts">
  /**
   * SOS Map View & Tactical Disaster Radar Grid
   * OpenStreetMap Tiles + Tactical Leaflet Native Markers + Real Peer Discovery + Compass HUD + H3 Grid
   * Creator & Lead Architect: Thabot <thabo47@gmail.com>
   * Protocol: TOG v1.1 Phase 5 & Spatial Grid
   * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
   */
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import type { Map as LeafletMap, LayerGroup as LeafletLayerGroup } from 'leaflet';
  import { latLngToCell, gridDisk, cellToBoundary } from 'h3-js';
  import { ODBL_ATTRIBUTION } from '../../core/spatial/TileProxyClient';
  import { peerDiscoveryManager } from '../../core/state/PeerDiscoveryStore';
  import { NativeBridgeDispatcher } from '../../core/native/NativeBridgeDispatcher';
  import { SosRadarEngine } from '../../core/spatial/SosRadarEngine';
  import { i18n } from '../../core/i18n/I18nStore';

  const translations = i18n.translations;

  export let sosTargets: Array<{
    id: string;
    lat: number;
    lng: number;
    category: string;
    distanceMeters?: number;
    floor?: number;
    senderNodeId?: string;
  }> = [];

  export let peerNodes: Array<{
    shortNodeId: string;
    lat: number;
    lng: number;
    batteryBars: number;
    rssiTier: number;
    distanceMeters: number;
    isInternet?: boolean | undefined;
    isGateway?: boolean | undefined;
    isFriend?: boolean | undefined;
    isSos?: boolean | undefined;
    customName?: string | undefined;
  }> = [];

  export let myNodeId: string = '';
  export let isOnline: boolean = false;

  $: myShortNodeId = myNodeId ? '#' + myNodeId.slice(0, 4).toUpperCase() : '#47A1';

  const dispatch = createEventDispatcher<{
    openRadar: { target: any };
    startDirectChat: { peerId: string; peerName: string };
  }>();

  let mapEl: HTMLDivElement;
  let map: LeafletMap | null = null;
  let L: typeof import('leaflet') | null = null;
  let markersLayer: LeafletLayerGroup | null = null;
  let ringsLayer: LeafletLayerGroup | null = null;
  let vectorBasemapLayer: LeafletLayerGroup | null = null;
  let h3GridLayer: LeafletLayerGroup | null = null;
  let tileLayerRef: any = null;

  // Persistent User Position and Zoom Level
  let myPos: { lat: number; lng: number } = { lat: 13.7563, lng: 100.5018 };
  let mapZoomLevel = 16;
  let isLocating = false;

  // Heading & Compass State with Low-Pass Smoothing Filter
  let deviceHeading = 0;
  let filteredHeading = 0;
  let isHeadingUpMode = false;

  // Inspector Card State
  let selectedNode: {
    name: string;
    avatar: string;
    role: string;
    roleBg: string;
    radio: string;
    isInternet: boolean;
    internetStatus: string;
    distance: string;
    bearing: string;
    rssi: string;
    battery: string;
    freshness: string;
    security: string;
    extra: string;
    isSelf?: boolean;
    isSos?: boolean;
    peerId?: string;
    lat?: number;
    lng?: number;
  } | null = null;

  function loadPersistedMapState() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const savedLoc = window.localStorage.getItem('outgrid_last_gps_location');
        if (savedLoc) {
          const parsed = JSON.parse(savedLoc);
          if (parsed && typeof parsed.lat === 'number' && typeof parsed.lng === 'number' && !isNaN(parsed.lat) && !isNaN(parsed.lng)) {
            myPos = { lat: parsed.lat, lng: parsed.lng };
          }
        }
        const savedZoom = window.localStorage.getItem('outgrid_last_map_zoom');
        if (savedZoom) {
          const parsedZ = parseInt(savedZoom, 10);
          if (!isNaN(parsedZ) && parsedZ >= 10 && parsedZ <= 19) {
            mapZoomLevel = parsedZ;
          }
        }
      }
    } catch {
      // Storage fallback
    }
  }

  function savePersistedMapState() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('outgrid_last_gps_location', JSON.stringify(myPos));
        window.localStorage.setItem('outgrid_last_map_zoom', String(mapZoomLevel));
      }
    } catch {
      // Storage fallback
    }
  }

  let lastOrientationTimestamp = 0;

  function handleDeviceOrientation(e: DeviceOrientationEvent) {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    // Throttle orientation processing to max 10 Hz (every 100ms) to preserve CPU and battery
    if (now - lastOrientationTimestamp < 100) return;
    lastOrientationTimestamp = now;

    let heading: number | null = null;
    if ((e as any).webkitCompassHeading !== undefined && (e as any).webkitCompassHeading !== null) {
      // iOS WebKit Compass Heading
      heading = Number((e as any).webkitCompassHeading);
    } else if (e.alpha !== null && e.alpha !== undefined) {
      // Android standard orientation (0 = North)
      heading = (360 - e.alpha) % 360;
    }
    if (heading !== null && !isNaN(heading)) {
      updateCompass(heading);
    }
  }

  /**
   * Smooths compass degree readings with Shortest Angular Distance Low-Pass Filter
   * Eliminates rapid number flickering & jitter
   */
  function updateCompass(deg: number) {
    if (isNaN(deg)) return;
    const normalized = ((deg % 360) + 360) % 360;

    // Shortest angular difference (-180 to +180)
    let diff = (normalized - filteredHeading) % 360;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    // Apply smoothing alpha = 0.18
    filteredHeading = (filteredHeading + diff * 0.18 + 360) % 360;
    const rounded = Math.round(filteredHeading);

    // Deadband threshold: update UI only on >= 1 degree difference
    if (Math.abs(rounded - deviceHeading) >= 1) {
      deviceHeading = rounded;
    }
  }

  function toggleHeadingMode() {
    isHeadingUpMode = !isHeadingUpMode;
  }

  function getCardinalDirection(deg: number): string {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return directions[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
  }

  function zoomIn() {
    if (map && mapZoomLevel < 19) {
      mapZoomLevel++;
      map.setZoom(mapZoomLevel);
      savePersistedMapState();
    }
  }

  function zoomOut() {
    if (map && mapZoomLevel > 11) {
      mapZoomLevel--;
      map.setZoom(mapZoomLevel);
      savePersistedMapState();
    }
  }

  function locateMe() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    isLocating = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        isLocating = false;
        myPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        peerDiscoveryManager.setUserLocation(myPos.lat, myPos.lng);
        savePersistedMapState();
        if (map) {
          map.flyTo([myPos.lat, myPos.lng], mapZoomLevel, { animate: true, duration: 1 });
        }
        renderMapElements();
      },
      () => {
        isLocating = false;
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }

  function focusAllNodes() {
    if (!map || !L) return;
    const points: Array<[number, number]> = [[myPos.lat, myPos.lng]];

    for (const p of peerNodes) {
      if (!p.shortNodeId || p.shortNodeId.startsWith('node-') || p.shortNodeId.includes('rescue') || p.shortNodeId.includes('medic') || p.shortNodeId === '#TEST' || p.hasRealSignal === false) {
        continue;
      }
      if (p.lat && p.lng && !isNaN(p.lat) && !isNaN(p.lng)) {
        points.push([p.lat, p.lng]);
      }
    }
    for (const s of sosTargets) {
      if (s.lat && s.lng && !isNaN(s.lat) && !isNaN(s.lng)) {
        points.push([s.lat, s.lng]);
      }
    }

    if (points.length === 1) {
      map.flyTo(points[0], 16, { animate: true, duration: 0.8 });
    } else {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17, animate: true });
    }
  }

  function handleSelectSelf() {
    selectedNode = {
      name: `${$translations.self_node_title || 'โหนดของฉัน'} (${myShortNodeId})`,
      avatar: '📍',
      role: $translations.self_host_role || '📍 โหนดของฉัน (Host)',
      roleBg: '#064e3b',
      radio: '⚡ BLE 5.3 Coded PHY (S=8)',
      isInternet: isOnline,
      internetStatus: isOnline ? ($translations.internet_online_status || 'ต่อ Internet ได้ (Online) 🟢') : ($translations.mesh_only_status || 'Bluetooth Mesh เท่านั้น (Off-Grid) 🔘'),
      distance: $translations.current_position_dist || '0 เมตร (ตำแหน่งปัจจุบัน)',
      bearing: '000° N',
      rssi: '-35 dBm',
      battery: '85% (~34h)',
      freshness: $translations.active_now || 'ใช้งานอยู่ตอนนี้ 🟢',
      security: `Curve25519 (0x${(myNodeId || '47A1').slice(0, 8).toUpperCase()})`,
      extra: $translations.self_status_extra || 'สถานะ: ให้บริการทวนสัญญาณฉุกเฉินและกระจายพิกัดกู้ภัย 24/7',
      isSelf: true,
      lat: myPos.lat,
      lng: myPos.lng
    };
  }

  function handleSelectPeer(peer: (typeof peerNodes)[0]) {
    const bearingDeg = SosRadarEngine.calculateBearingDegrees(
      myPos.lat,
      myPos.lng,
      peer.lat,
      peer.lng
    );
    const cardDir = getCardinalDirection(bearingDeg);

    selectedNode = {
      name: peer.customName || `${$translations.peer_node_title || 'โหนด'} ${peer.shortNodeId}`,
      avatar: peer.isSos ? '🆘' : (peer.isFriend ? '👥' : (peer.isGateway ? '🌐' : '📡')),
      role: peer.isSos ? ($translations.node_role_sos || '🚨 ผู้ประสบภัย (SOS)') : (peer.isFriend ? ($translations.node_role_friend || '👥 โหนดเพื่อน') : (peer.isGateway ? ($translations.node_role_gateway || '🌐 เกตเวย์ดาวเทียม') : ($translations.node_role_relay || '📡 โหนดวิทยุกู้ภัย'))),
      roleBg: peer.isSos ? '#dc2626' : (peer.isFriend ? '#0284c7' : (peer.isGateway ? '#059669' : '#334155')),
      radio: '⚡ BLE 5.0 Coded PHY',
      isInternet: Boolean(peer.isInternet || peer.isGateway),
      internetStatus: (peer.isInternet || peer.isGateway) ? ($translations.mesh_gateway_status || 'ต่อ Internet ได้ (BLE+4G/Satellite) 🟢') : ($translations.mesh_only_status || 'Bluetooth Mesh เท่านั้น (Off-Grid) 🔘'),
      distance: `~${peer.distanceMeters || 120} m`,
      bearing: `${String(Math.round(bearingDeg)).padStart(3, '0')}° ${cardDir}`,
      rssi: `${peer.rssiTier === 3 ? '-68' : peer.rssiTier === 2 ? '-78' : '-88'} dBm`,
      battery: `${Math.min(100, peer.batteryBars * 20)}%`,
      freshness: $translations.recently_scanned || 'สแกนพบล่าสุด 🟢',
      security: 'Curve25519 Direct Wire 🔒',
      extra: peer.isSos ? ($translations.peer_extra_sos || '🚨 ส่งสัญญาณฉุกเฉินผ่านคลื่นวิทยุใกล้เคียง') : ($translations.peer_extra_relay || 'โหนดในรัศมีสื่อสารวิทยุกู้ภัยตรง'),
      peerId: peer.shortNodeId,
      isSos: Boolean(peer.isSos),
      lat: peer.lat,
      lng: peer.lng
    };
  }

  function handleSelectSosTarget(target: (typeof sosTargets)[0]) {
    const bearingDeg = SosRadarEngine.calculateBearingDegrees(
      myPos.lat,
      myPos.lng,
      target.lat,
      target.lng
    );
    const cardDir = getCardinalDirection(bearingDeg);
    const dist = target.distanceMeters || SosRadarEngine.calculateDistanceMeters(
      myPos.lat,
      myPos.lng,
      target.lat,
      target.lng
    );

    selectedNode = {
      name: `${$translations.sos_target_prefix || 'ขอความช่วยเหลือ:'} ${target.category || 'SOS'}`,
      avatar: '🆘',
      role: $translations.sos_target_role || '🚨 ผู้ประสบภัยขอความช่วยเหลือ',
      roleBg: '#dc2626',
      radio: '📻 BLE Emergency Flood Beacon',
      isInternet: false,
      internetStatus: $translations.mesh_only_status || 'Bluetooth Mesh เท่านั้น (Off-Grid) 🔘',
      distance: `~${dist} m`,
      bearing: `${String(Math.round(bearingDeg)).padStart(3, '0')}° ${cardDir}`,
      rssi: '-75 dBm',
      battery: $translations.sos_power_saving || 'โหมดประหยัดพลังงาน ⚠️',
      freshness: $translations.sos_alert_freshness || 'สัญญาณแจ้งเตือนฉุกเฉิน 🚨',
      security: 'TOG v1.1 Emergency Wire',
      extra: `${$translations.sos_emergency_prefix || 'เหตุฉุกเฉิน:'} ${target.category} ${target.floor ? `(${$translations.sos_floor_prefix || 'ชั้น'} ${target.floor})` : ''}`,
      isSos: true,
      peerId: target.senderNodeId || target.id,
      lat: target.lat,
      lng: target.lng
    };
  }

  function handleDirectChatFromInspector() {
    if (!selectedNode || selectedNode.isSelf) return;
    dispatch('startDirectChat', {
      peerId: selectedNode.peerId || 'node-peer',
      peerName: selectedNode.name
    });
    selectedNode = null;
  }

  function handleStartRadarFromInspector() {
    if (!selectedNode) return;
    dispatch('openRadar', {
      target: {
        id: selectedNode.peerId || 'target',
        name: selectedNode.name,
        distanceMeters: parseInt(selectedNode.distance.replace(/\D/g, '')) || 250,
        bearing: selectedNode.bearing,
        lat: selectedNode.lat || myPos.lat,
        lng: selectedNode.lng || myPos.lng,
        category: selectedNode.isSos ? ($translations.radar_cat_sos || '🚨 ฉุกเฉิน SOS') : ($translations.radar_cat_rescue || '📍 พิกัดกู้ภัย')
      }
    });
    selectedNode = null;
  }

  function renderMapElements() {
    if (!map || !L || !markersLayer || !ringsLayer) return;

    markersLayer.clearLayers();
    ringsLayer.clearLayers();

    // 1. Concentric Range Rings centered at myPos
    L.circle([myPos.lat, myPos.lng], {
      radius: 100,
      color: 'rgba(56, 189, 248, 0.45)',
      weight: 1.2,
      fillColor: 'rgba(56, 189, 248, 0.04)',
      fillOpacity: 0.15,
      interactive: false
    }).addTo(ringsLayer);

    L.circle([myPos.lat, myPos.lng], {
      radius: 250,
      color: 'rgba(56, 189, 248, 0.35)',
      weight: 1.2,
      fillColor: 'transparent',
      interactive: false
    }).addTo(ringsLayer);

    L.circle([myPos.lat, myPos.lng], {
      radius: 500,
      color: 'rgba(251, 191, 36, 0.65)',
      weight: 1.5,
      dashArray: '5, 5',
      fillColor: 'transparent',
      interactive: false
    }).addTo(ringsLayer);

    // 2. Self Marker Icon
    const selfIcon = L.divIcon({
      className: 'tactical-marker-container',
      html: `
        <div class="tactical-marker-wrap">
          <div class="node-icon-bubble bubble-self">📍</div>
          <span class="node-tag tag-self">${$translations.self_marker_label || 'ฉัน'} (${myShortNodeId})</span>
        </div>
      `,
      iconSize: [80, 50],
      iconAnchor: [40, 25]
    });

    const selfMarker = L.marker([myPos.lat, myPos.lng], { icon: selfIcon, zIndexOffset: 500 });
    selfMarker.on('click', () => handleSelectSelf());
    selfMarker.addTo(markersLayer);

    // 3. Real Discovered Peer Markers
    for (const peer of peerNodes) {
      if (!peer.shortNodeId || peer.shortNodeId.startsWith('node-') || peer.shortNodeId.includes('rescue') || peer.shortNodeId.includes('medic') || peer.shortNodeId === '#TEST' || peer.hasRealSignal === false) {
        continue; // Strictly omit mockups and unverified contacts without real radio presence
      }

      let pLat = peer.lat;
      let pLng = peer.lng;
      if (!pLat || !pLng || isNaN(pLat) || isNaN(pLng)) continue;

      // Distance check from myPos: If peer is within estimated radio range (<=1000m) but lat/lng is placed far away, relocate relative to myPos
      const distFromMe = SosRadarEngine.calculateDistanceMeters(myPos.lat, myPos.lng, pLat, pLng);
      if (distFromMe > 1500 && (peer.distanceMeters || 100) <= 1000) {
        const hexNum = parseInt(peer.shortNodeId.replace(/[^0-9A-Fa-f]/g, ''), 16) || 45;
        const angle = (hexNum % 360) * (Math.PI / 180);
        const rangeM = peer.distanceMeters || 150;
        pLat = myPos.lat + (rangeM * Math.cos(angle)) / 111320;
        pLng = myPos.lng + (rangeM * Math.sin(angle)) / (111320 * Math.cos((myPos.lat * Math.PI) / 180));
      }

      const isNet = Boolean(peer.isInternet || peer.isGateway);
      const isSos = Boolean(peer.isSos);
      const iconClass = isSos ? 'bubble-sos pulse-glow' : (isNet ? 'bubble-internet' : 'bubble-bluetooth');
      const tagClass = isSos ? 'tag-sos' : (isNet ? 'tag-internet' : 'tag-bt');
      const emoji = isSos ? '🆘' : (peer.isFriend ? '👥' : (peer.isGateway ? '🌐' : '📡'));

      const peerIcon = L.divIcon({
        className: 'tactical-marker-container',
        html: `
          <div class="tactical-marker-wrap">
            <div class="node-icon-bubble ${iconClass}">${emoji}</div>
            <span class="node-tag ${tagClass}">
              ${peer.shortNodeId} (${peer.distanceMeters || 120}m ${isNet ? '🌐' : '🔘'})
            </span>
          </div>
        `,
        iconSize: [100, 50],
        iconAnchor: [50, 25]
      });

      const peerMarker = L.marker([pLat, pLng], { icon: peerIcon, zIndexOffset: isSos ? 600 : 300 });
      peerMarker.on('click', () => handleSelectPeer({ ...peer, lat: pLat, lng: pLng }));
      peerMarker.addTo(markersLayer);
    }

    // 4. Real SOS Target Alerts
    for (const sos of sosTargets) {
      if (!sos.lat || !sos.lng || isNaN(sos.lat) || isNaN(sos.lng)) continue;

      const sosIcon = L.divIcon({
        className: 'tactical-marker-container',
        html: `
          <div class="tactical-marker-wrap">
            <div class="node-icon-bubble bubble-sos pulse-glow">🆘</div>
            <span class="node-tag tag-sos">${sos.category || 'SOS'} ${sos.distanceMeters ? `(${sos.distanceMeters}m)` : ''}</span>
          </div>
        `,
        iconSize: [110, 50],
        iconAnchor: [55, 25]
      });

      const sosMarker = L.marker([sos.lat, sos.lng], { icon: sosIcon, zIndexOffset: 700 });
      sosMarker.on('click', () => handleSelectSosTarget(sos));
      sosMarker.addTo(markersLayer);
    }
  }

  async function loadOfflineVectorBasemap() {
    if (!map || !L || !vectorBasemapLayer) return;
    try {
      const resp = await fetch('/data/world_basemap_l2.json');
      if (resp.ok) {
        const geojson = await resp.json();
        vectorBasemapLayer.clearLayers();
        L.geoJSON(geojson, {
          style: (feature) => {
            const layer = feature?.properties?.layer;
            if (layer === 'country') {
              return { color: '#0369a1', weight: 1.5, fillColor: '#082f49', fillOpacity: 0.25 };
            }
            if (layer === 'state') {
              return { color: '#38bdf8', weight: 1, dashArray: '4, 4', fillOpacity: 0.1 };
            }
            if (layer === 'river') {
              return { color: '#0284c7', weight: 2 };
            }
            return { color: '#64748b', weight: 1 };
          },
          pointToLayer: (feature, latlng) => {
            return L!.circleMarker(latlng, {
              radius: 4,
              fillColor: '#38bdf8',
              color: '#ffffff',
              weight: 1,
              opacity: 1,
              fillOpacity: 0.8
            });
          }
        }).addTo(vectorBasemapLayer);
      }
    } catch (err) {
      console.warn('Offline basemap load fallback:', err);
    }
  }

  function getH3ResolutionForZoom(zoom: number): number {
    if (zoom >= 18) return 10;
    if (zoom >= 16) return 9;
    if (zoom >= 14) return 8;
    if (zoom >= 12) return 7;
    if (zoom >= 10) return 6;
    if (zoom >= 8) return 5;
    return 4;
  }

  function renderH3Grid() {
    if (!map || !L || !h3GridLayer) return;
    h3GridLayer.clearLayers();

    const zoom = map.getZoom();
    const center = map.getCenter();
    if (!center || isNaN(center.lat) || isNaN(center.lng)) return;

    const resolution = getH3ResolutionForZoom(zoom);
    let centerCell: string;
    try {
      centerCell = latLngToCell(center.lat, center.lng, resolution);
    } catch {
      return;
    }

    const k = zoom >= 16 ? 4 : (zoom >= 12 ? 3 : 2);
    let cells: string[];
    try {
      cells = gridDisk(centerCell, k);
    } catch {
      return;
    }

    const polygonCoords: Array<Array<[number, number]>> = [];
    for (const cell of cells) {
      try {
        const boundary = cellToBoundary(cell);
        if (boundary && boundary.length >= 6) {
          polygonCoords.push(boundary as Array<[number, number]>);
        }
      } catch {}
    }

    if (polygonCoords.length > 0) {
      L.polygon(polygonCoords, {
        color: '#38bdf8',
        weight: 1,
        opacity: 0.35,
        dashArray: '3, 4',
        fillColor: '#0284c7',
        fillOpacity: 0.04,
        interactive: false
      }).addTo(h3GridLayer);
    }
  }

  async function initLeafletMap() {
    if (typeof window === 'undefined' || !mapEl) return;
    L = (await import('leaflet')) as typeof import('leaflet');
    try {
      await import('leaflet/dist/leaflet.css');
    } catch {}

    map = L.map(mapEl, {
      center: [myPos.lat, myPos.lng],
      zoom: mapZoomLevel,
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      touchZoom: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      boxZoom: true
    });

    tileLayerRef = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    vectorBasemapLayer = L.layerGroup().addTo(map);
    h3GridLayer = L.layerGroup().addTo(map);
    ringsLayer = L.layerGroup().addTo(map);
    markersLayer = L.layerGroup().addTo(map);

    loadOfflineVectorBasemap();

    map.on('zoomend', () => {
      if (map) {
        mapZoomLevel = map.getZoom();
        savePersistedMapState();
        renderH3Grid();
      }
    });

    map.on('moveend', () => {
      if (map) {
        const c = map.getCenter();
        if (c && !isNaN(c.lat) && !isNaN(c.lng)) {
          savePersistedMapState();
        }
        renderH3Grid();
      }
    });

    renderMapElements();
    renderH3Grid();
  }

  // Reactive updater when peerNodes, sosTargets, myPos, or translations update
  $: if (map && L && markersLayer && (peerNodes || sosTargets || myPos || $translations)) {
    renderMapElements();
  }

  onMount(async () => {
    loadPersistedMapState();

    if (typeof window !== 'undefined') {
      const win = window as any;
      if ('ondeviceorientationabsolute' in win) {
        win.addEventListener('deviceorientationabsolute', handleDeviceOrientation as any, true);
      } else {
        win.addEventListener('deviceorientation', handleDeviceOrientation as any, true);
      }
    }

    await initLeafletMap();
    locateMe();
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('deviceorientationabsolute', handleDeviceOrientation as any, true);
      window.removeEventListener('deviceorientation', handleDeviceOrientation as any, true);
    }
    if (map) {
      map.remove();
      map = null;
    }
  });

  $: currentHeading = isHeadingUpMode ? deviceHeading : 0;
</script>

<div class="map-container">
  <!-- Top Bar -->
  <div class="map-top-bar">
    <div class="top-bar-left">
      <span class="top-bar-title">{$translations.map_radar_title || '🗺️ เรดาร์ & แผนที่กู้ภัย'}</span>
      <div class="top-bar-legend">
        {#if isOnline}
          <span class="legend-internet">{$translations.legend_online || '🟢 ต่อ Internet ได้'}</span>
        {:else}
          <span class="legend-bt">{$translations.legend_offline_bt || '🔘 ออฟไลน์ (Bluetooth Mesh)'}</span>
        {/if}
        <span class="legend-divider">|</span>
        <span class="legend-hint">{$translations.legend_mode_hint || 'โหนด: 🟢 ต่อเน็ต 🔘 วิทยุ'}</span>
      </div>
    </div>
    <div class="top-bar-right-group">
      {#if peerNodes.length > 0}
        <button class="btn-focus-peers" on:click={focusAllNodes} title="{$translations.btn_focus_nodes_title || 'ซูมแสดงโหนดทั้งหมด'} ({peerNodes.length})">
          👥 {peerNodes.length} Node
        </button>
      {/if}
      <span class="top-bar-geofence">Geofence: ≤500m</span>
    </div>
  </div>

  <div class="map-canvas-area">
    <!-- Leaflet OpenStreetMap Background Layer (Interactive) -->
    <div
      bind:this={mapEl}
      class="leaflet-map-host"
      style="transform: rotate({-currentHeading}deg); transform-origin: 50% 50%;"
    ></div>

    <!-- Floating HUD Overlay Layer (Non-blocking) -->
    <div class="tactical-hud-overlay">
      <!-- Tactical Compass HUD -->
      <div class="compass-hud">
        <div
          class="compass-dial"
          on:click={toggleHeadingMode}
          title={$translations.compass_toggle_title || 'แตะเพื่อสลับโหมด หมุนตามมือถือ (Heading-Up) / ทิศเหนือชี้ขึ้น (North-Up)'}
          role="button"
          tabindex="0"
          on:keydown={(e) => e.key === 'Enter' && toggleHeadingMode()}
        >
          <span class="cardinal cardinal-n">N</span>
          <span class="cardinal cardinal-s">S</span>
          <span class="cardinal cardinal-w">W</span>
          <span class="cardinal cardinal-e">E</span>
          <div class="compass-needle" style="transform: rotate({-currentHeading}deg);">
            <div class="compass-needle-n"></div>
            <div class="compass-needle-s"></div>
          </div>
        </div>
        <div class="compass-degree-badge">🧭 {String(deviceHeading).padStart(3, '0')}° {getCardinalDirection(deviceHeading)}</div>
        <button class="compass-mode-btn" class:active={isHeadingUpMode} on:click={toggleHeadingMode}>
          {isHeadingUpMode ? ($translations.compass_heading_up || '📱 หมุนตามมือถือ') : ($translations.compass_north_up || '⬆️ ทิศเหนือชี้ขึ้น')}
        </button>
      </div>

      <!-- Interactive Map Zoom Controls -->
      <div class="map-zoom-controls">
        <button class="btn-zoom" on:click={zoomIn} title={$translations.zoom_in || 'ซูมเข้า'}>+</button>
        <div class="zoom-level-badge">L{mapZoomLevel}</div>
        <button class="btn-zoom" on:click={zoomOut} title={$translations.zoom_out || 'ซูมออก'}>−</button>
        <button class="btn-zoom btn-center" on:click={locateMe} title={$translations.locate_me || 'ระบุตำแหน่งของฉัน'} class:locating={isLocating}>
          {isLocating ? '⏳' : '🎯'}
        </button>
        {#if peerNodes.length > 0}
          <button class="btn-zoom btn-nodes-focus" on:click={focusAllNodes} title={$translations.btn_focus_all_nodes || 'จัดมุมมองให้เห็นทุกโหนด'}>
            👥
          </button>
        {/if}
      </div>

      <!-- Floating Tactical Node Inspector Card -->
      {#if selectedNode}
        <div class="node-inspector-card">
          <div class="card-header-row">
            <div class="card-avatar-group">
              <span class="card-avatar">{selectedNode.avatar}</span>
              <div>
                <h4 class="card-node-name">{selectedNode.name}</h4>
                <div class="card-badges-row">
                  <span class="card-badge" style="background: {selectedNode.roleBg}; color: #fff;">
                    {selectedNode.role}
                  </span>
                  <span class="card-badge" style="background: {selectedNode.isInternet ? '#064e3b' : '#1e293b'}; color: {selectedNode.isInternet ? '#34d399' : '#94a3b8'};">
                    {selectedNode.isInternet ? '🌐 INTERNET GATEWAY' : '🔘 BLUETOOTH ONLY'}
                  </span>
                </div>
              </div>
            </div>
            <button class="btn-close-card" on:click={() => selectedNode = null}>✕</button>
          </div>

          <div class="card-metrics-grid">
            <div><span class="metric-label">{$translations.inspector_distance || '📏 ระยะห่าง:'}</span> <b class="metric-val" style="color: #38bdf8;">{selectedNode.distance}</b></div>
            <div><span class="metric-label">{$translations.inspector_bearing || '🧭 ทิศทาง:'}</span> <b class="metric-val">{selectedNode.bearing}</b></div>
            <div><span class="metric-label">{$translations.inspector_internet || '🌐 การต่อเน็ต:'}</span> <b class="metric-val" style="color: {selectedNode.isInternet ? '#22c55e' : '#cbd5e1'};">{selectedNode.internetStatus}</b></div>
            <div><span class="metric-label">{$translations.inspector_signal || '📶 สัญญาณ:'}</span> <b class="metric-val" style="color: #34d399;">{selectedNode.rssi}</b></div>
            <div><span class="metric-label">{$translations.inspector_battery || '🔋 แบตเตอรี่:'}</span> <b class="metric-val">{selectedNode.battery}</b></div>
            <div><span class="metric-label">{$translations.inspector_freshness || '⏱️ สดใหม่:'}</span> <b class="metric-val" style="color: #22c55e;">{selectedNode.freshness}</b></div>
            <div class="metric-full"><span class="metric-label">{$translations.inspector_radio || '📻 คลื่นวิทยุ:'}</span> <b class="metric-val" style="color: #38bdf8;">{selectedNode.radio}</b></div>
            <div class="metric-full metric-extra">{selectedNode.extra}</div>
          </div>

          <div class="card-actions-row">
            {#if !selectedNode.isSelf}
              <button class="btn-action-chat" on:click={handleDirectChatFromInspector}>
                {$translations.inspector_direct_chat || '💬 แชต 1:1 ทันที'}
              </button>
              <button class="btn-action-radar" on:click={handleStartRadarFromInspector}>
                <span>🧭</span> <span>{$translations.inspector_radar_nav || 'นำทางเรดาร์'}</span>
              </button>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>

  <div class="attribution-footer">
    {ODBL_ATTRIBUTION}
  </div>
</div>

<style>
  .map-container {
    position: relative;
    width: 100%;
    height: 100%;
    flex: 1;
    min-height: 0;
    background: #0b1120;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .map-top-bar {
    padding: 5px 10px;
    background: #0b1120;
    border-bottom: 1px solid #1e293b;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    z-index: 10;
    flex-shrink: 0;
  }
  .top-bar-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .top-bar-title {
    color: #38bdf8;
    font-weight: 700;
  }
  .top-bar-legend {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    background: rgba(15, 23, 42, 0.8);
    padding: 2px 8px;
    border-radius: 4px;
    border: 1px solid #334155;
  }
  .legend-internet {
    color: #22c55e;
    font-weight: 800;
  }
  .legend-divider {
    color: #64748b;
  }
  .legend-bt {
    color: #cbd5e1;
    font-weight: 600;
  }
  .legend-hint {
    color: #94a3b8;
    font-size: 9.5px;
  }
  .top-bar-right-group {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .btn-focus-peers {
    background: #0c4a6e;
    border: 1px solid #0284c7;
    color: #38bdf8;
    font-size: 10px;
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 4px;
    cursor: pointer;
  }
  .top-bar-geofence {
    color: #64748b;
    font-size: 10px;
  }
  .map-canvas-area {
    position: relative;
    flex: 1;
    min-height: 0;
    background: #060b13;
    overflow: hidden;
  }
  .leaflet-map-host {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
    transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  /* Non-blocking HUD Overlay */
  .tactical-hud-overlay {
    position: absolute;
    inset: 0;
    z-index: 15;
    pointer-events: none;
  }

  /* Tactical Compass HUD */
  .compass-hud {
    position: absolute;
    top: 10px;
    right: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    pointer-events: auto;
  }
  .compass-dial {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: rgba(15, 23, 42, 0.88);
    border: 2px solid #38bdf8;
    box-shadow: 0 0 10px rgba(56, 189, 248, 0.4);
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    backdrop-filter: blur(4px);
  }
  .cardinal {
    position: absolute;
    font-size: 8px;
    font-weight: 900;
  }
  .cardinal-n { top: 2px; color: #ef4444; }
  .cardinal-s { bottom: 2px; color: #64748b; }
  .cardinal-w { left: 3px; color: #64748b; }
  .cardinal-e { right: 3px; color: #64748b; }
  .compass-needle {
    position: absolute;
    width: 6px;
    height: 36px;
    top: 7px;
    left: 22px;
    transform-origin: 50% 50%;
    pointer-events: none;
    transition: transform 0.15s ease-out;
  }
  .compass-needle-n {
    width: 0;
    height: 0;
    border-left: 3px solid transparent;
    border-right: 3px solid transparent;
    border-bottom: 18px solid #ef4444;
  }
  .compass-needle-s {
    width: 0;
    height: 0;
    border-left: 3px solid transparent;
    border-right: 3px solid transparent;
    border-top: 18px solid #94a3b8;
  }
  .compass-degree-badge {
    background: rgba(15, 23, 42, 0.9);
    border: 1px solid #334155;
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 800;
    color: #38bdf8;
    white-space: nowrap;
    backdrop-filter: blur(4px);
  }
  .compass-mode-btn {
    background: #1e293b;
    color: #cbd5e1;
    border: 1px solid #334155;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 9px;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
    pointer-events: auto;
  }
  .compass-mode-btn.active {
    background: #0284c7;
    color: #fff;
    border-color: #38bdf8;
  }

  /* Map Zoom Controls */
  .map-zoom-controls {
    position: absolute;
    top: 10px;
    left: 12px;
    display: flex;
    flex-direction: column;
    gap: 5px;
    pointer-events: auto;
  }
  .btn-zoom {
    width: 32px;
    height: 32px;
    background: rgba(15, 23, 42, 0.9);
    border: 1px solid #334155;
    color: #38bdf8;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    font-weight: 900;
    cursor: pointer;
    box-shadow: 0 4px 10px rgba(0,0,0,0.5);
    transition: all 0.15s ease;
    backdrop-filter: blur(6px);
  }
  .btn-zoom:hover {
    background: #1e293b;
    border-color: #38bdf8;
    transform: scale(1.08);
  }
  .btn-center {
    font-size: 11px;
  }
  .btn-center.locating {
    animation: pulse-locating 1s infinite;
  }
  .btn-nodes-focus {
    font-size: 13px;
    background: rgba(12, 74, 110, 0.9);
    border-color: #0284c7;
  }
  @keyframes pulse-locating {
    0% { transform: scale(1); }
    50% { transform: scale(1.15); }
    100% { transform: scale(1); }
  }
  .zoom-level-badge {
    background: rgba(15, 23, 42, 0.9);
    border: 1px solid #334155;
    color: #38bdf8;
    font-size: 9px;
    font-weight: 800;
    padding: 2px 4px;
    border-radius: 4px;
    text-align: center;
  }

  /* Tactical Leaflet Marker Styles */
  :global(.tactical-marker-container) {
    background: transparent;
    border: none;
  }
  :global(.tactical-marker-wrap) {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transform: translateY(-8px);
    transition: transform 0.15s ease;
  }
  :global(.tactical-marker-wrap:hover) {
    transform: translateY(-8px) scale(1.12);
  }
  :global(.node-icon-bubble) {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    box-shadow: 0 0 10px rgba(0,0,0,0.8);
    border: 2px solid #64748b;
    background: #1e293b;
    color: #cbd5e1;
    transition: all 0.2s ease;
  }
  :global(.bubble-self) {
    border-color: #38bdf8 !important;
    background: #0f172a !important;
    box-shadow: 0 0 12px rgba(56, 189, 248, 0.8) !important;
  }
  :global(.bubble-internet) {
    border-color: #22c55e !important;
    background: #022c22 !important;
    box-shadow: 0 0 12px rgba(34, 197, 94, 0.7) !important;
  }
  :global(.bubble-bluetooth) {
    border-color: #64748b !important;
    background: #1e293b !important;
    color: #94a3b8 !important;
    box-shadow: 0 0 8px rgba(0,0,0,0.5) !important;
  }
  :global(.bubble-sos) {
    border-color: #ef4444 !important;
    background: #450a0a !important;
    box-shadow: 0 0 16px rgba(239, 68, 68, 0.9) !important;
    animation: pulse-sos-glow 1.2s infinite;
  }
  @keyframes pulse-sos-glow {
    0% { transform: scale(1); box-shadow: 0 0 8px rgba(239, 68, 68, 0.5); }
    50% { transform: scale(1.14); box-shadow: 0 0 20px rgba(239, 68, 68, 0.95); }
    100% { transform: scale(1); box-shadow: 0 0 8px rgba(239, 68, 68, 0.5); }
  }
  :global(.node-tag) {
    font-size: 9px;
    font-weight: 700;
    background: rgba(15, 23, 42, 0.92);
    padding: 1px 5px;
    border-radius: 4px;
    margin-top: 2px;
    border: 1px solid #334155;
    white-space: nowrap;
    box-shadow: 0 2px 6px rgba(0,0,0,0.6);
  }
  :global(.tag-self) {
    color: #38bdf8;
    border-color: #0284c7;
  }
  :global(.tag-internet) {
    color: #34d399;
    border-color: #059669;
  }
  :global(.tag-bt) {
    color: #cbd5e1;
    border-color: #475569;
  }
  :global(.tag-sos) {
    color: #f87171;
    border-color: #dc2626;
  }

  /* Floating Tactical Node Inspector Card */
  .node-inspector-card {
    position: absolute;
    bottom: 14px;
    left: 12px;
    right: 12px;
    max-width: 420px;
    margin: 0 auto;
    background: rgba(15, 23, 42, 0.96);
    border: 1px solid #0284c7;
    border-radius: 10px;
    padding: 12px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.85);
    backdrop-filter: blur(8px);
    pointer-events: auto;
  }
  .card-header-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 8px;
    border-bottom: 1px solid #1e293b;
    padding-bottom: 6px;
  }
  .card-avatar-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .card-avatar {
    font-size: 24px;
  }
  .card-node-name {
    font-size: 13px;
    color: #f8fafc;
    margin: 0;
  }
  .card-badges-row {
    display: flex;
    gap: 4px;
    margin-top: 2px;
  }
  .card-badge {
    font-size: 9px;
    font-weight: 800;
    padding: 1px 5px;
    border-radius: 3px;
  }
  .btn-close-card {
    background: transparent;
    border: none;
    color: #94a3b8;
    font-size: 16px;
    cursor: pointer;
  }
  .card-metrics-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    font-size: 11px;
    margin-bottom: 10px;
    line-height: 1.4;
  }
  .metric-label {
    color: #94a3b8;
  }
  .metric-val {
    color: #f1f5f9;
  }
  .metric-full {
    grid-column: span 2;
  }
  .metric-extra {
    font-size: 10px;
    color: #94a3b8;
  }
  .card-actions-row {
    display: flex;
    gap: 6px;
  }
  .btn-action-chat {
    flex: 1;
    background: #0284c7;
    color: #fff;
    border: none;
    padding: 7px;
    border-radius: 6px;
    font-weight: 700;
    font-size: 11px;
    cursor: pointer;
  }
  .btn-action-radar {
    background: #1e293b;
    color: #38bdf8;
    border: 1px solid #0284c7;
    padding: 7px 12px;
    border-radius: 6px;
    font-weight: 700;
    font-size: 11px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .attribution-footer {
    font-size: 9px;
    color: #475569;
    padding: 2px 8px;
    background: #0b1120;
    text-align: right;
    flex-shrink: 0;
  }
</style>
