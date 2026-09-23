<script lang="ts">
  /**
   * SOS Map View & Tactical Radar Grid (Mockup UI Alignment)
   * OpenStreetMap Tiles + Tactical Compass HUD + H3 Hexagon Overlay + Range Rings + Node Inspector Card
   * Creator & Lead Architect: Thabot <thabo47@gmail.com>
   * Protocol: TOG v1.1 Phase 5
   * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
   */
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { base } from '$app/paths';
  import type { Map as LeafletMap } from 'leaflet';
  import { KAnonymityHeatmap } from '../../core/spatial/KAnonymityHeatmap';
  import { H3GridEngine } from '../../core/spatial/H3GridEngine';
  import { ODBL_ATTRIBUTION } from '../../core/spatial/TileProxyClient';
  import { peerDiscoveryManager } from '../../core/state/PeerDiscoveryStore';

  export let sosTargets: Array<{
    id: string;
    lat: number;
    lng: number;
    category: string;
    distanceMeters?: number;
    floor?: number;
  }> = [];

  export let peerNodes: Array<{
    shortNodeId: string;
    lat: number;
    lng: number;
    batteryBars: number;
    rssiTier: number;
    distanceMeters: number;
    isInternet?: boolean;
    isGateway?: boolean;
    isFriend?: boolean;
    isSos?: boolean;
    customName?: string;
  }> = [];

  const dispatch = createEventDispatcher<{
    openRadar: { target: any };
    startDirectChat: { peerId: string; peerName: string };
  }>();

  let mapEl: HTMLDivElement;
  let map: LeafletMap | null = null;
  let L: typeof import('leaflet') | null = null;
  let myPos: { lat: number; lng: number } | null = { lat: 13.7563, lng: 100.5018 };
  let isLocating = false;

  // Zoom & Heading State
  let mapZoomLevel = 16;
  let deviceHeading = 0;
  let isHeadingUpMode = true;
  let simulatedHeading = 0;

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

  // Real device orientation listener
  function handleDeviceOrientation(e: DeviceOrientationEvent) {
    if (e.alpha !== null && e.alpha !== undefined) {
      const heading = (360 - e.alpha) % 360;
      updateCompass(Math.round(heading));
    }
  }

  function updateCompass(deg: number) {
    deviceHeading = Math.round(deg);
    simulatedHeading = deviceHeading;
  }

  function handleSimulatedHeadingChange(e: Event) {
    const val = Number((e.target as HTMLInputElement).value);
    updateCompass(val);
  }

  function toggleHeadingMode() {
    isHeadingUpMode = !isHeadingUpMode;
  }

  function getCardinalDirection(deg: number): string {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return directions[Math.round(deg / 45) % 8];
  }

  function zoomIn() {
    if (mapZoomLevel < 19) {
      mapZoomLevel++;
      if (map) map.setZoom(mapZoomLevel);
    }
  }

  function zoomOut() {
    if (mapZoomLevel > 13) {
      mapZoomLevel--;
      if (map) map.setZoom(mapZoomLevel);
    }
  }

  function resetZoom() {
    mapZoomLevel = 16;
    if (map && myPos) {
      map.setView([myPos.lat, myPos.lng], 16);
    }
  }

  function locateMe() {
    if (!navigator.geolocation) return;
    isLocating = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        isLocating = false;
        myPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        peerDiscoveryManager.setUserLocation(myPos.lat, myPos.lng);
        if (map) {
          map.flyTo([myPos.lat, myPos.lng], mapZoomLevel, { animate: true, duration: 1 });
        }
      },
      () => {
        isLocating = false;
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function handleSelectNode(nodeKey: string, customData?: any) {
    if (customData) {
      selectedNode = customData;
      return;
    }

    if (nodeKey === 'self') {
      selectedNode = {
        name: 'โหนดของฉัน (#47A1)',
        avatar: '📍',
        role: '📍 โหนดของฉัน (Host)',
        roleBg: '#064e3b',
        radio: '⚡ BLE 5.3 Coded PHY',
        isInternet: false,
        internetStatus: 'Bluetooth Mesh เท่านั้น (Off-Grid) 🔘',
        distance: '0 เมตร (ตำแหน่งปัจจุบัน)',
        bearing: '000° N',
        rssi: '-35 dBm (สูงสุด)',
        battery: '85% (~34 ชม.)',
        freshness: 'ใช้งานอยู่ตอนนี้ 🟢',
        security: 'Curve25519 (0x47A1B29F)',
        extra: 'สถานะ: ให้บริการทวนสัญญาณฉุกเฉินและกระจายพิกัด 24/7',
        isSelf: true
      };
    } else if (nodeKey === 'rescue') {
      selectedNode = {
        name: 'หน่วยกู้ภัยสว่างบริบูรณ์ (Rescue #01A4)',
        avatar: '🚑',
        role: '👥 โหนดเพื่อน (กู้ภัย)',
        roleBg: '#0284c7',
        radio: '⚡ BLE 5.0 Coded PHY',
        isInternet: true,
        internetStatus: 'ต่อ Internet ได้ (Satellite Gateway) 🟢',
        distance: '~210 เมตร (ในรัศมี)',
        bearing: '045° NE (ทิศ 1)',
        rssi: '-72 dBm (สัญญาณดีเยี่ยม 📶)',
        battery: '82% (~32 ชม.)',
        freshness: '12 วินาทีที่แล้ว 🟢',
        security: 'E2EE 1-Hop Direct 🔒',
        extra: 'สถานะ: ทีมอาสากำลังเดินทางด้วยเรือยางพร้อมอุปกรณ์กู้ชีพ และมีช่องสัญญาณดาวเทียมต่อเน็ต',
        peerId: 'node-rescue-team',
        lat: 13.7580,
        lng: 100.5035
      };
    } else if (nodeKey === 'sos') {
      selectedNode = {
        name: 'สัญญาณขอความช่วยเหลือฉุกเฉิน (SOS #9B22)',
        avatar: '🆘',
        role: '🚨 ผู้ประสบภัยขอความช่วยเหลือ',
        roleBg: '#dc2626',
        radio: '📻 BT 4.2 Legacy (20m - 100m)',
        isInternet: false,
        internetStatus: 'Bluetooth Mesh เท่านั้น (Off-Grid) 🔘',
        distance: '~320 เมตร (ทะลุ Geofence)',
        bearing: '215° SW (ทิศ 4)',
        rssi: '-84 dBm (ปานกลาง)',
        battery: '28% ⚠️ (โหมดประหยัดพลังงาน)',
        freshness: '45 วินาทีที่แล้ว 🟡',
        security: 'Emergency Flood Wire 📢',
        extra: 'ข้อความเหตุ: ระดับน้ำท่วมสูงมิดชั้นล่าง ติดอยู่บนหลังคาต้องการความช่วยเหลือด่วน 2 คน',
        isSos: true,
        peerId: 'node-sos-9b22',
        lat: 13.7540,
        lng: 100.4990
      };
    } else if (nodeKey === 'medic') {
      selectedNode = {
        name: 'หมอสมชาย (Field Doctor #4C55)',
        avatar: '🩺',
        role: '👥 โหนดเพื่อน (แพทย์สนาม)',
        roleBg: '#0284c7',
        radio: '⚡ BLE 5.0 Coded PHY',
        isInternet: false,
        internetStatus: 'Bluetooth Mesh เท่านั้น (Off-Grid) 🔘',
        distance: '~380 เมตร',
        bearing: '315° NW (ทิศ 6)',
        rssi: '-78 dBm (สัญญาณดี)',
        battery: '74% (~28 ชม.)',
        freshness: '1 นาทีที่แล้ว 🟢',
        security: 'Curve25519 (0x4C55A9B1)',
        extra: 'สถานะ: จุดปฐมพยาบาลศาลาประชาคม มียาลดไข้และน้ำเกลือสำรอง',
        peerId: 'node-medic-04',
        lat: 13.7590,
        lng: 100.4980
      };
    } else if (nodeKey === 'relayNode') {
      selectedNode = {
        name: 'อาสาสมัครลาดตระเวน (Scout 01)',
        avatar: '🦺',
        role: 'โหนดทวนสัญญาณ (Relay)',
        roleBg: '#334155',
        radio: '⚡ BLE 5.0 Standard',
        isInternet: false,
        internetStatus: 'Bluetooth Mesh เท่านั้น (Off-Grid) 🔘',
        distance: '~450 เมตร',
        bearing: '135° SE (ทิศ 3)',
        rssi: '-82 dBm (ปานกลาง)',
        battery: '68% (~24 ชม.)',
        freshness: '35 วินาทีที่แล้ว 🟢',
        security: 'Curve25519 (0x38E1012C)',
        extra: 'สถานะ: ลาดตระเวนเส้นทางแม่น้ำ จุดอพยพวัดสะพานพร้อมรับผู้ประสบภัย',
        peerId: 'node-scout-01',
        lat: 13.7530,
        lng: 100.5050
      };
    }
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
        lat: selectedNode.lat || 13.7563,
        lng: selectedNode.lng || 100.5018,
        category: selectedNode.isSos ? '🚨 ฉุกเฉิน SOS' : '📍 พิกัดกู้ภัย'
      }
    });
    selectedNode = null;
  }

  async function initLeafletMap() {
    L = (await import('leaflet')) as typeof import('leaflet');
    try {
      await import('leaflet/dist/leaflet.css');
    } catch {}
    if (!mapEl) return;

    map = L.map(mapEl, {
      center: [13.7563, 100.5018],
      zoom: 16,
      zoomControl: false,
      attributionControl: false
    });

    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    });

    tileLayer.addTo(map);

    map.on('zoomend', () => {
      if (map) mapZoomLevel = map.getZoom();
    });
  }

  onMount(async () => {
    if (typeof window !== 'undefined') {
      window.addEventListener('deviceorientation', handleDeviceOrientation, true);
    }
    await initLeafletMap();
    locateMe();
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('deviceorientation', handleDeviceOrientation, true);
    }
    if (map) {
      map.remove();
      map = null;
    }
  });

  $: currentHeading = isHeadingUpMode ? deviceHeading : 0;
  $: zoomScale = Math.pow(1.22, mapZoomLevel - 16);
</script>

<div class="map-container">
  <!-- Top Bar -->
  <div class="map-top-bar">
    <div class="top-bar-left">
      <span class="top-bar-title">🗺️ เรดาร์ & แผนที่กู้ภัย</span>
      <div class="top-bar-legend">
        <span class="legend-internet">🟢 ต่อ Internet ได้</span>
        <span class="legend-divider">|</span>
        <span class="legend-bt">🔘 Bluetooth เท่านั้น</span>
      </div>
    </div>
    <span class="top-bar-right">Geofence: ≤500m</span>
  </div>

  <div class="map-canvas-area">
    <!-- Tactical Compass HUD Overlay -->
    <div class="compass-hud">
      <div class="compass-dial" on:click={toggleHeadingMode} title="แตะเพื่อสลับโหมด หมุนตามมือถือ (Heading-Up) / ทิศเหนือชี้ขึ้น (North-Up)" role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && toggleHeadingMode()}>
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
        {isHeadingUpMode ? '📱 หมุนตามมือถือ' : '⬆️ ทิศเหนือชี้ขึ้น'}
      </button>
    </div>

    <!-- Interactive Map Zoom Controls -->
    <div class="map-zoom-controls">
      <button class="btn-zoom" on:click={zoomIn} title="ซูมเข้า">+</button>
      <div class="zoom-level-badge">L{mapZoomLevel}</div>
      <button class="btn-zoom" on:click={zoomOut} title="ซูมออก">−</button>
      <button class="btn-zoom btn-center" on:click={locateMe} title="ระบุตำแหน่งของฉัน">🎯</button>
    </div>

    <!-- Leaflet OpenStreetMap Background Layer -->
    <div bind:this={mapEl} class="leaflet-map-host"></div>

    <!-- Rotating Radar Overlay Layer -->
    <div class="map-rotator-container" style="transform: rotate({-currentHeading}deg);">
      <!-- Background Texture Grid -->
      <div class="osm-tile-grid" style="background-size: 100% 100%, {Math.round(40 * zoomScale)}px {Math.round(40 * zoomScale)}px, {Math.round(40 * zoomScale)}px {Math.round(40 * zoomScale)}px;"></div>

      <!-- Dynamic Scale Layer for H3, Rings, and Pins -->
      <div class="map-scale-layer" style="transform: scale({zoomScale});">
        <!-- Subtle H3 Hexagon Grid Overlay -->
        <svg class="h3-subtle-overlay" width="100%" height="100%">
          <defs>
            <pattern id="h3-hex-pattern-map" width="60" height="104" patternUnits="userSpaceOnUse" patternTransform="scale(1)">
              <path d="M 30,0 L 60,17.3 L 60,52 L 30,69.3 L 0,52 L 0,17.3 Z" fill="none" stroke="#38bdf8" stroke-width="0.75" stroke-dasharray="2,2"/>
              <path d="M 30,52 L 60,69.3 L 60,104 L 30,121.3 L 0,104 L 0,69.3 Z" fill="none" stroke="#38bdf8" stroke-width="0.75" stroke-dasharray="2,2"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#h3-hex-pattern-map)" />
        </svg>

        <!-- Concentric Range Rings -->
        <div class="radar-circle c100"><span class="ring-label" style="left: 6px;">100m</span></div>
        <div class="radar-circle c250"><span class="ring-label" style="left: 10px;">250m</span></div>
        <div class="radar-circle c500"><span class="ring-label" style="left: 14px; color: #fbbf24;">500m Geofence</span></div>

        <!-- 1. Self Node Pin (Bluetooth Off-Grid -> Gray Circle 🔘) -->
        <div class="node-pin" style="top: 50%; left: 50%;" on:click={() => handleSelectNode('self')} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && handleSelectNode('self')}>
          <div class="node-icon-bubble bubble-bluetooth">📍</div>
          <span class="node-tag" style="color: #cbd5e1; border-color: #64748b;">ฉัน (#47A1)</span>
        </div>

        <!-- 2. Rescue Pin (Connected to Internet -> Green Circle 🟢 with BLE + 4G) -->
        <div class="node-pin" style="top: 38%; left: 62%;" on:click={() => handleSelectNode('rescue')} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && handleSelectNode('rescue')}>
          <div class="node-icon-bubble bubble-internet">🚑</div>
          <span class="node-tag" style="color: #34d399; border-color: #059669;">กู้ภัย (210m 🌐 BLE+4G)</span>
        </div>

        <!-- 3. Emergency SOS Node Pin (Active Distress Beacon -> Red Circle 🚨) -->
        <div class="node-pin" style="top: 65%; left: 35%;" on:click={() => handleSelectNode('sos')} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && handleSelectNode('sos')}>
          <div class="node-icon-bubble bubble-sos">🆘</div>
          <span class="node-tag" style="color: #f87171; border-color: #dc2626;">SOS #9B22 (320m)</span>
        </div>

        <!-- 4. Medic Friend Node Pin (Bluetooth Only -> Gray Circle 🔘) -->
        <div class="node-pin" style="top: 30%; left: 32%;" on:click={() => handleSelectNode('medic')} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && handleSelectNode('medic')}>
          <div class="node-icon-bubble bubble-bluetooth">🩺</div>
          <span class="node-tag" style="color: #94a3b8; border-color: #475569;">หมอสมชาย (380m)</span>
        </div>

        <!-- 5. Relay Scout Node Pin (Bluetooth Only -> Gray Circle 🔘) -->
        <div class="node-pin" style="top: 68%; left: 68%;" on:click={() => handleSelectNode('relayNode')} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && handleSelectNode('relayNode')}>
          <div class="node-icon-bubble bubble-bluetooth">🦺</div>
          <span class="node-tag" style="color: #94a3b8; border-color: #475569;">Scout 01 (450m)</span>
        </div>

        <!-- Dynamic Live Discovered Peers from Mesh Store -->
        {#each peerNodes as peer}
          <div
            class="node-pin"
            style="top: {50 + (peer.lat - (myPos?.lat || 13.7563)) * 8000}%; left: {50 + (peer.lng - (myPos?.lng || 100.5018)) * 8000}%;"
            on:click={() => handleSelectNode('', {
              name: peer.customName || `โหนด ${peer.shortNodeId}`,
              avatar: peer.isSos ? '🆘' : (peer.isFriend ? '👥' : '📡'),
              role: peer.isSos ? '🚨 ผู้ประสบภัย (SOS)' : (peer.isFriend ? '👥 โหนดเพื่อน' : 'โหนดรอบตัว'),
              roleBg: peer.isSos ? '#dc2626' : (peer.isFriend ? '#0284c7' : '#334155'),
              radio: '⚡ BLE 5.0 Coded PHY',
              isInternet: Boolean(peer.isInternet || peer.isGateway),
              internetStatus: (peer.isInternet || peer.isGateway) ? 'ต่อ Internet ได้ (BLE+4G) 🟢' : 'Bluetooth Mesh เท่านั้น (Off-Grid) 🔘',
              distance: `~${peer.distanceMeters} เมตร`,
              bearing: '000° N',
              rssi: `${peer.rssiTier === 3 ? '-70' : '-85'} dBm`,
              battery: `${peer.batteryBars * 20}%`,
              freshness: 'ไม่กี่วินาทีที่แล้ว 🟢',
              security: 'Curve25519',
              extra: 'โหนดในรัศมีวิทยุสื่อสารตรง',
              peerId: peer.shortNodeId,
              isSos: peer.isSos,
              lat: peer.lat,
              lng: peer.lng
            })}
            role="button"
            tabindex="0"
            on:keydown={(e) => e.key === 'Enter'}
          >
            <div class="node-icon-bubble {peer.isSos ? 'bubble-sos' : ((peer.isInternet || peer.isGateway) ? 'bubble-internet' : 'bubble-bluetooth')}">
              {peer.isSos ? '🆘' : (peer.isFriend ? '👥' : '📡')}
            </div>
            <span class="node-tag" style="color: {(peer.isInternet || peer.isGateway) ? '#34d399' : '#94a3b8'};">
              {peer.shortNodeId} (~{peer.distanceMeters}m {(peer.isInternet || peer.isGateway) ? '🌐' : '🔘'})
            </span>
          </div>
        {/each}
      </div>
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
          <div><span class="metric-label">📏 ระยะห่าง:</span> <b class="metric-val" style="color: #38bdf8;">{selectedNode.distance}</b></div>
          <div><span class="metric-label">🧭 ทิศทาง:</span> <b class="metric-val">{selectedNode.bearing}</b></div>
          <div><span class="metric-label">🌐 การต่อเน็ต:</span> <b class="metric-val" style="color: {selectedNode.isInternet ? '#22c55e' : '#cbd5e1'};">{selectedNode.internetStatus}</b></div>
          <div><span class="metric-label">📶 สัญญาณ:</span> <b class="metric-val" style="color: #34d399;">{selectedNode.rssi}</b></div>
          <div><span class="metric-label">🔋 แบตเตอรี่:</span> <b class="metric-val">{selectedNode.battery}</b></div>
          <div><span class="metric-label">⏱️ สดใหม่:</span> <b class="metric-val" style="color: #22c55e;">{selectedNode.freshness}</b></div>
          <div class="metric-full"><span class="metric-label">📻 คลื่นวิทยุ:</span> <b class="metric-val" style="color: #38bdf8;">{selectedNode.radio}</b></div>
          <div class="metric-full metric-extra">{selectedNode.extra}</div>
        </div>

        <div class="card-actions-row">
          {#if !selectedNode.isSelf}
            <button class="btn-action-chat" on:click={handleDirectChatFromInspector}>
              💬 แชต 1:1 ทันที
            </button>
            <button class="btn-action-radar" on:click={handleStartRadarFromInspector}>
              <span>🧭</span> <span>นำทางเรดาร์</span>
            </button>
          {/if}
        </div>
      </div>
    {/if}

    <!-- Desktop Simulated Rotation Slider -->
    <div class="sim-rotation-bar">
      <span class="sim-label">🔄 จำลองการหมุนมือถือ:</span>
      <input
        type="range"
        min="0"
        max="359"
        value={simulatedHeading}
        class="sim-slider"
        on:input={handleSimulatedHeadingChange}
      />
      <span class="sim-val">{simulatedHeading}°</span>
    </div>
  </div>

  <div class="attribution-footer" style="font-size: 9px; color: #475569; padding: 2px 8px; background: #0b1120; text-align: right;">
    {ODBL_ATTRIBUTION}
  </div>
</div>

<style>
  .map-container {
    position: relative;
    width: 100%;
    height: 560px;
    background: #0b1120;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .map-top-bar {
    padding: 6px 12px;
    background: #0b1120;
    border-bottom: 1px solid #1e293b;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    z-index: 10;
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
  .top-bar-right {
    color: #64748b;
  }
  .map-canvas-area {
    position: relative;
    flex: 1;
    background: #060b13;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .leaflet-map-host {
    position: absolute;
    inset: 0;
    z-index: 1;
    opacity: 0.45;
    filter: brightness(0.7) contrast(1.2);
  }
  .osm-tile-grid {
    position: absolute;
    inset: 0;
    opacity: 0.35;
    background-image: 
      radial-gradient(circle at 50% 50%, rgba(30, 58, 138, 0.4) 0%, rgba(15, 23, 42, 0.8) 100%),
      linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: 100% 100%, 40px 40px, 40px 40px;
  }
  .map-rotator-container {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.15s ease-out;
    transform-origin: 50% 50%;
    z-index: 5;
  }
  .map-scale-layer {
    position: absolute;
    inset: 0;
    transform-origin: center center;
    transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .h3-subtle-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.22;
  }
  .radar-circle {
    position: absolute;
    border-radius: 50%;
    border: 1px solid rgba(56, 189, 248, 0.35);
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
  }
  .radar-circle.c100 { width: 140px; height: 140px; }
  .radar-circle.c250 { width: 280px; height: 280px; }
  .radar-circle.c500 { width: 440px; height: 440px; border-color: rgba(56, 189, 248, 0.6); border-style: dashed; }
  .ring-label {
    position: absolute;
    font-size: 9px;
    color: #38bdf8;
    background: rgba(15, 23, 42, 0.85);
    padding: 1px 4px;
    border-radius: 3px;
    top: 50%;
    transform: translateY(-50%);
  }

  /* Map Zoom Controls */
  .map-zoom-controls {
    position: absolute;
    top: 10px;
    left: 12px;
    z-index: 20;
    display: flex;
    flex-direction: column;
    gap: 5px;
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

  /* Node Pins */
  .node-pin {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    transform: translate(-50%, -50%);
    z-index: 10;
    transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .node-pin:hover {
    transform: translate(-50%, -50%) scale(1.15);
    z-index: 25;
  }
  .node-icon-bubble {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
    box-shadow: 0 0 12px rgba(0,0,0,0.8);
    border: 2.5px solid #64748b;
    background: #1e293b;
    color: #cbd5e1;
    transition: all 0.2s ease;
  }
  .node-icon-bubble.bubble-internet {
    border-color: #22c55e !important;
    background: #022c22 !important;
    box-shadow: 0 0 14px rgba(34, 197, 94, 0.6) !important;
  }
  .node-icon-bubble.bubble-bluetooth {
    border-color: #64748b !important;
    background: #1e293b !important;
    color: #94a3b8 !important;
    box-shadow: 0 0 8px rgba(0,0,0,0.5) !important;
  }
  .node-icon-bubble.bubble-sos {
    border-color: #ef4444 !important;
    background: #450a0a !important;
    box-shadow: 0 0 16px rgba(239, 68, 68, 0.85) !important;
    animation: pulse-sos 1.2s infinite;
  }
  @keyframes pulse-sos {
    0% { transform: scale(1); box-shadow: 0 0 8px rgba(239, 68, 68, 0.5); }
    50% { transform: scale(1.12); box-shadow: 0 0 20px rgba(239, 68, 68, 0.85); }
    100% { transform: scale(1); box-shadow: 0 0 8px rgba(239, 68, 68, 0.5); }
  }
  .node-tag {
    font-size: 10px;
    font-weight: 700;
    background: rgba(15, 23, 42, 0.9);
    padding: 1px 5px;
    border-radius: 4px;
    margin-top: 2px;
    border: 1px solid #334155;
    white-space: nowrap;
  }

  /* Tactical Compass HUD */
  .compass-hud {
    position: absolute;
    top: 10px;
    right: 12px;
    z-index: 20;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  .compass-dial {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: rgba(15, 23, 42, 0.88);
    border: 2px solid #38bdf8;
    box-shadow: 0 0 10px rgba(56, 189, 248, 0.4);
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }
  .cardinal {
    position: absolute;
    font-size: 8px;
    font-weight: 900;
  }
  .cardinal-n { top: 3px; color: #ef4444; }
  .cardinal-s { bottom: 3px; color: #64748b; }
  .cardinal-w { left: 4px; color: #64748b; }
  .cardinal-e { right: 4px; color: #64748b; }
  .compass-needle {
    position: absolute;
    width: 6px;
    height: 38px;
    top: 7px;
    left: 23px;
    transform-origin: 50% 50%;
    pointer-events: none;
    transition: transform 0.1s ease-out;
  }
  .compass-needle-n {
    width: 0;
    height: 0;
    border-left: 3px solid transparent;
    border-right: 3px solid transparent;
    border-bottom: 19px solid #ef4444;
  }
  .compass-needle-s {
    width: 0;
    height: 0;
    border-left: 3px solid transparent;
    border-right: 3px solid transparent;
    border-top: 19px solid #94a3b8;
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
  }
  .compass-mode-btn.active {
    background: #0284c7;
    color: #fff;
    border-color: #38bdf8;
  }

  /* Floating Tactical Node Inspector Card */
  .node-inspector-card {
    position: absolute;
    bottom: 42px;
    left: 12px;
    right: 12px;
    max-width: 420px;
    margin: 0 auto;
    z-index: 30;
    background: rgba(15, 23, 42, 0.95);
    border: 1px solid #0284c7;
    border-radius: 10px;
    padding: 12px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.8);
    backdrop-filter: blur(8px);
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
    color: #64748b;
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

  /* Simulated Rotation Slider */
  .sim-rotation-bar {
    position: absolute;
    bottom: 8px;
    left: 12px;
    z-index: 20;
    background: rgba(15, 23, 42, 0.9);
    border: 1px solid #334155;
    border-radius: 6px;
    padding: 4px 8px;
    font-size: 10px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .sim-label {
    color: #94a3b8;
  }
  .sim-slider {
    width: 90px;
  }
  .sim-val {
    color: #38bdf8;
    font-weight: bold;
    width: 32px;
  }
</style>
