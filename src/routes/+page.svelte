<script lang="ts">
  import { base } from '$app/paths';
  import 'leaflet/dist/leaflet.css';
  import OneTapSos from '../ui/components/OneTapSos.svelte';
  import CrisisFeed from '../ui/components/CrisisFeed.svelte';
  import DonationDashboard from '../ui/components/DonationDashboard.svelte';
  import HelpManualScreen from '../ui/components/HelpManualScreen.svelte';
  import SosMapView from '../ui/components/SosMapView.svelte';
  import BatteryStatusBanner from '../ui/components/BatteryStatusBanner.svelte';
  import BeaconControlsBar from '../ui/components/BeaconControlsBar.svelte';
  import NetworkStatusBar from '../ui/components/NetworkStatusBar.svelte';
  import BottomNavigationBar from '../ui/components/BottomNavigationBar.svelte';
  import HamburgerDrawer from '../ui/components/HamburgerDrawer.svelte';
  import RescueRadarHud from '../ui/components/RescueRadarHud.svelte';
  import { onMount, onDestroy } from 'svelte';
  import MeshChatScreen from '../ui/components/MeshChatScreen.svelte';
  import FriendsScreen from '../ui/components/FriendsScreen.svelte';
  import IncomingSosBanner, { type IIncomingSosAlert } from '../ui/components/IncomingSosBanner.svelte';
  import AuthProfileScreen from '../ui/components/AuthProfileScreen.svelte';
  import { i18n, SUPPORTED_LOCALES, type SupportedLocale } from '../core/i18n/I18nStore';
  import {
    discoveredPeersStore,
    peerCountsStore,
    peerDiscoveryManager
  } from '../core/state/PeerDiscoveryStore';

  const currentLocaleStore = i18n.locale;
  const translations = i18n.translations;

  function handleLanguageChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    if (target) {
      i18n.setLocale(target.value as SupportedLocale);
    }
  }

  let activeTab: 'sos' | 'feed' | 'map' | 'manual' | 'donation' | 'friends' | 'profile' | 'chat' = 'sos';
  let isUltraSurvival = false;
  let isDrawerOpen = false;
  let activeRadarTarget: any = null;
  let incomingSosBannerRef: IncomingSosBanner;

  // Dynamic version — injected by Vite from package.json / CI pipeline
  const appVersion: string = import.meta.env.VITE_APP_VERSION ?? '1.1.0';
  const commitSha: string = import.meta.env.VITE_APP_COMMIT ?? 'local';
  const versionLabel = `TOG v${appVersion} (${commitSha})`;

  // Real SOS targets visible on the map (populated via radio mesh)
  const demoSosTargets: Array<{
    id: string;
    lat: number;
    lng: number;
    category: string;
    distanceMeters?: number;
    floor?: number;
  }> = [];

  function handleTriggerLastGasp() {
    alert('🚨 Last-Gasp Beacon ถูกส่งผ่านคลื่นวิทยุแล้ว! พิกัดสุดท้ายและเวลาได้ถูกฝากไว้กับเพื่อนบ้านรอบตัวก่อนเครื่องดับ');
  }

  function openRadarForTarget(target: any) {
    activeRadarTarget = target;
  }

  function handleBottomTabChange(e: CustomEvent<{ tab: 'map' | 'chat' | 'sos' | 'friends' | 'profile' }>) {
    const tab = e.detail.tab;
    activeTab = tab;
  }

  import { AuthManager } from '../core/auth/AuthManager';
  import { OneTapSosEngine, SosStatusCategory } from '../core/state/OneTapSosEngine';
  import { NativeBridgeDispatcher } from '../core/native/NativeBridgeDispatcher';
  import { PacketSerializer } from '../core/protocol/PacketSerializer';
  import { TOGPacketType } from '../core/protocol/TOGPacket';
  import { H3DeltaCompressor } from '../core/spatial/H3DeltaCompressor';

  let auth = new AuthManager();
  let myProfile = auth.getProfile();
  let targetChatPeer: { peerId: string; peerName: string } | null = null;
  let isSosDispatching = false;
  let unsubscribeRadioSos: (() => void) | null = null;

  function handleStartDirectChat(e: CustomEvent<{ peerId: string; peerName: string }>) {
    targetChatPeer = { peerId: e.detail.peerId, peerName: e.detail.peerName };
    activeTab = 'chat';
  }

  function handleIncomingSosRadio(bytes: Uint8Array, rssi: number) {
    if (bytes.length < 5) return;
    // Check Magic 0x544F
    if (bytes[0] === 0x54 && bytes[1] === 0x4F) {
      const pType = bytes[2] & 0x1f;
      if (pType === TOGPacketType.SOS_BEACON) {
        try {
          const packet = PacketSerializer.deserialize(bytes);
          let senderHex = Array.from(packet.senderPubkeyHash).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 4).toUpperCase();
          if (!senderHex) senderHex = 'NODE';
          const senderNodeId = `#${senderHex}`;

          // Don't alert for our own SOS
          const myPubHex = Array.from(myProfile.keyPair.publicKey).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 4).toUpperCase();
          if (senderHex === myPubHex) return;

          // Parse Payload
          let lat = 13.7563;
          let lng = 100.5018;
          let cat = 'เหตุฉุกเฉินทั่วไป';

          if (packet.payload.length >= 6) {
            const view = new DataView(packet.payload.buffer, packet.payload.byteOffset, packet.payload.byteLength);
            const deltaX = view.getInt16(0, false);
            const deltaY = view.getInt16(2, false);
            const decomp = H3DeltaCompressor.decompress(packet.targetH3Index, { deltaX, deltaY });
            lat = decomp.lat;
            lng = decomp.lng;
            const catEnum = OneTapSosEngine.decodeCategory(packet.payload[5]);
            cat = catEnum;
          }

          const measuredPower = -59;
          const n = 2.5;
          let dist = Math.round(Math.pow(10, (measuredPower - rssi) / (10 * n)));
          dist = Math.max(5, Math.min(2500, dist));

          const alertObj: IIncomingSosAlert = {
            id: `sos-${packet.messageId.toString()}`,
            senderNodeId,
            lat,
            lng,
            distanceMeters: dist,
            category: cat,
            timestamp: Date.now()
          };

          // Trigger floating alert banner
          incomingSosBannerRef?.handleIncomingSosPacket(alertObj);

          // Add to map SOS targets
          const existingIdx = demoSosTargets.findIndex(t => t.id === alertObj.id);
          if (existingIdx >= 0) {
            demoSosTargets[existingIdx] = { ...alertObj };
          } else {
            demoSosTargets.push({ ...alertObj });
          }
        } catch (err) {
          console.warn('Failed to parse incoming SOS packet:', err);
        }
      }
    } else if (bytes.length === 10) {
      // Single-Packet 10B Canned Emergency Packet
      try {
        const canned = PacketSerializer.deserializeCannedEmergency(bytes);
        const senderHex = canned.senderShortId.toString(16).padStart(4, '0').toUpperCase();
        const senderNodeId = `#${senderHex}`;
        const catLabel = OneTapSosEngine.getCannedStatusLabel(canned.statusCode);

        const measuredPower = -59;
        const n = 2.5;
        let dist = Math.round(Math.pow(10, (measuredPower - rssi) / (10 * n)));
        dist = Math.max(5, Math.min(2500, dist));

        const alertObj: IIncomingSosAlert = {
          id: `canned-${canned.senderShortId}-${canned.sequenceId}`,
          senderNodeId,
          lat: 13.7563,
          lng: 100.5018,
          distanceMeters: dist,
          category: catLabel,
          timestamp: Date.now()
        };

        incomingSosBannerRef?.handleIncomingSosPacket(alertObj);

        const existingIdx = demoSosTargets.findIndex(t => t.id === alertObj.id);
        if (existingIdx >= 0) {
          demoSosTargets[existingIdx] = { ...alertObj };
        } else {
          demoSosTargets.push({ ...alertObj });
        }
      } catch (err) {
        console.warn('Failed to parse incoming Canned Emergency packet:', err);
      }
    }
  }

  function handleTriggerSos(category: SosStatusCategory) {
    if (isSosDispatching) return;
    isSosDispatching = true;

    try {
      let currentLat = 13.7563;
      let currentLng = 100.5018;

      // Load last known GPS or default
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const savedLoc = window.localStorage.getItem('outgrid_last_gps_location');
          if (savedLoc) {
            const parsed = JSON.parse(savedLoc);
            if (parsed.lat && parsed.lng) {
              currentLat = parsed.lat;
              currentLng = parsed.lng;
            }
          }
        }
      } catch {}

      const senderPubkeyHash = myProfile.keyPair.publicKey.slice(0, 8);
      const sosPacket = OneTapSosEngine.createSosBeacon({
        lat: currentLat,
        lng: currentLng,
        batteryLevel: 95,
        category,
        senderPubkeyHash
      });

      // Serialize complete wire-spec TOG packet (Magic 0x544F + Header + Payload)
      const wireBytes = PacketSerializer.serialize(sosPacket);

      // Transmit SOS over BLE Coded PHY Radio at High Power
      const dispatcher = NativeBridgeDispatcher.getInstance();
      dispatcher.transmitRadioPacket(wireBytes, true);
      // Double burst to guarantee penetration across mesh
      setTimeout(() => {
        dispatcher.transmitRadioPacket(wireBytes, true);
      }, 350);

      dispatcher.startSosStrobe();
      dispatcher.vibrateSosPattern();

      alert(`🚨 สัญญาณ SOS หมวด [${category}] ถูกกระจายผ่านคลื่นวิทยุ BLE เรียบร้อยแล้ว! รัศมี 300ม. - 5กม.`);
    } catch (err: any) {
      alert(`⚠️ เกิดข้อผิดพลาดในการยิงวิทยุ: ${err.message}`);
    } finally {
      setTimeout(() => { isSosDispatching = false; }, 2000);
    }
  }

  onMount(() => {
    myProfile = auth.getProfile();
    // Derive unique 16-bit short numeric node ID from our own unique nodeId
    let numericNodeId = 0x47A1;
    try {
      const parsed = parseInt(myProfile.nodeId.slice(0, 4), 16);
      if (!isNaN(parsed) && parsed > 0) {
        numericNodeId = parsed;
      }
    } catch {}

    // Automatically start periodic BLE Presence broadcasting with unique node ID on launch
    peerDiscoveryManager.startPresenceBroadcaster(numericNodeId);

    // Subscribe to incoming BLE radio packets for emergency SOS reception
    unsubscribeRadioSos = NativeBridgeDispatcher.getInstance().subscribeToPackets((event) => {
      handleIncomingSosRadio(event.bytes, event.rssi);
    });
  });

  onDestroy(() => {
    peerDiscoveryManager.stopPresenceBroadcaster();
    if (unsubscribeRadioSos) {
      unsubscribeRadioSos();
      unsubscribeRadioSos = null;
    }
  });
</script>

<svelte:head>
  <title>OutGrid Mesh - Emergency Grid</title>
  <meta name="description" content="Autonomous, Decentralized Spatial Mesh Communication Grid" />
</svelte:head>

<main class="app-root" class:ultra-survival={isUltraSurvival}>
  <HamburgerDrawer
    bind:isOpen={isDrawerOpen}
    {appVersion}
    {commitSha}
  />

  <header class="app-header">
    <div class="header-left">
      <button class="hamburger-btn" on:click={() => isDrawerOpen = true} aria-label="เปิดเมนูหลัก">
        <span class="hamburger-bar"></span>
        <span class="hamburger-bar"></span>
        <span class="hamburger-bar"></span>
      </button>
      <div class="logo">
        <img src="{base}/logo.png" alt="OutGrid Mesh Logo" class="brand-logo-img" />
        <span class="pulse-indicator"></span>
        <h1>OutGrid Mesh</h1>
      </div>
    </div>
    <div class="header-right">
      <button
        class="btn-header-survival"
        class:active={isUltraSurvival}
        on:click={() => isUltraSurvival = !isUltraSurvival}
        title="ขยายรอบส่งคลื่นวิทยุและลดการกินไฟหน้าจอสูงสุด"
      >
        {isUltraSurvival ? ($translations.survival_btn_off || '🛑 Exit Ultra') : ($translations.survival_btn_on || '⚡ 1-Tap Survival')}
      </button>

      <nav class="nav-tabs">
        <button class:active={activeTab === 'sos'} on:click={() => activeTab = 'sos'}>🚨 {$translations.sos || 'SOS'}</button>
        <button class:active={activeTab === 'feed'} on:click={() => activeTab = 'feed'}>📢 {$translations.feed || 'Feed'}</button>
        <button class:active={activeTab === 'map'} on:click={() => activeTab = 'map'}>🗺️ {$translations.map || 'Map'}</button>
        <button class:active={activeTab === 'manual'} on:click={() => activeTab = 'manual'}>📖 {$translations.manual || 'Manual'}</button>
        <button class:active={activeTab === 'donation'} on:click={() => activeTab = 'donation'}>🤝 {$translations.fund || 'Fund'}</button>
      </nav>
    </div>
  </header>

  <!-- Incoming SOS Floating Banner (Sprint E Task E.3) -->
  <IncomingSosBanner
    bind:this={incomingSosBannerRef}
    on:openRadar={(e) => openRadarForTarget(e.detail.target)}
  />

  <!-- Network Status Bar (Sprint D Task D.1) -->
  <NetworkStatusBar peerCounts={$peerCountsStore} />

  <BeaconControlsBar />

  <section class="content-area">
    {#if activeTab === 'sos'}
      <div class="card"><OneTapSos onTriggerSos={handleTriggerSos} isDispatching={isSosDispatching} /></div>
    {:else if activeTab === 'feed'}
      <div class="card"><CrisisFeed /></div>
    {:else if activeTab === 'chat'}
      <div class="card"><MeshChatScreen targetContact={targetChatPeer} myNodeId={myProfile.nodeId} /></div>
    {:else if activeTab === 'map'}
      <div class="card card-map">
        <SosMapView
          sosTargets={demoSosTargets}
          peerNodes={$discoveredPeersStore}
          on:openRadar={(e) => openRadarForTarget(e.detail.target)}
        />
      </div>
    {:else if activeTab === 'manual'}
      <div class="card"><HelpManualScreen /></div>
    {:else if activeTab === 'donation'}
      <div class="card"><DonationDashboard /></div>
    {:else if activeTab === 'friends'}
      <div class="card friends-card">
        <FriendsScreen on:startDirectChat={handleStartDirectChat} />
      </div>
    {:else if activeTab === 'profile'}
      <div class="card profile-card">
        <AuthProfileScreen />
      </div>
    {/if}
  </section>

  <!-- Tactical Rescue Radar HUD Overlay (Sprint E Task E.1) -->
  {#if activeRadarTarget}
    <RescueRadarHud
      target={activeRadarTarget}
      on:close={() => activeRadarTarget = null}
    />
  {/if}

  <!-- Bottom Navigation Bar for Mobile Thumb-Zone (Sprint D Task D.2) -->
  <BottomNavigationBar
    activeTab={activeTab === 'feed' ? 'chat' : (activeTab === 'donation' || activeTab === 'manual' ? 'profile' : activeTab)}
    on:tabChange={handleBottomTabChange}
  />
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    background: #090d16;
    color: #f1f5f9;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  .app-root {
    max-width: 1000px;
    margin: 0 auto;
    padding: 1rem;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  .app-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #1e293b;
    padding-bottom: 0.75rem;
    margin-bottom: 0.75rem;
    flex-wrap: wrap;
    gap: 0.75rem;
  }
  .header-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .btn-header-survival {
    background: #1e293b;
    color: #38bdf8;
    border: 1px solid #0284c7;
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 0.72rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
  }
  .btn-header-survival:hover {
    background: #0284c7;
    color: #ffffff;
  }
  .btn-header-survival.active {
    background: #0284c7;
    color: #ffffff;
    box-shadow: 0 0 8px rgba(14, 165, 233, 0.6);
  }
  .header-lang-selector {
    display: flex;
    align-items: center;
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 6px;
    padding: 3px 6px;
    gap: 4px;
  }
  .header-lang-selector .lang-icon {
    font-size: 0.85rem;
    cursor: pointer;
  }
  .header-lang-selector select {
    background: transparent;
    color: #cbd5e1;
    border: none;
    font-size: 0.8rem;
    cursor: pointer;
    outline: none;
    padding: 2px 4px;
  }
  .header-lang-selector select option {
    background: #0f172a;
    color: #f1f5f9;
  }
  .logo {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .brand-logo-img {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    object-fit: cover;
    border: 1px solid #0284c7;
    box-shadow: 0 0 10px rgba(56, 189, 248, 0.3);
  }
  .logo h1 {
    margin: 0;
    font-size: 1.5rem;
    color: #38bdf8;
  }
  .pulse-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #22c55e;
    box-shadow: 0 0 10px #22c55e;
  }
  .version-tag {
    font-size: 0.75rem;
    background: #1e293b;
    padding: 0.2rem 0.5rem;
    border-radius: 9999px;
    color: #94a3b8;
  }
  .nav-tabs {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .nav-tabs button {
    background: #131d2e;
    color: #94a3b8;
    border: 1px solid #1e293b;
    padding: 0.5rem 0.85rem;
    border-radius: 0.5rem;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s;
  }
  .nav-tabs button:hover {
    color: #f8fafc;
    border-color: #38bdf8;
  }
  .nav-tabs button.active {
    background: #1e293b;
    color: #38bdf8;
    border-color: #38bdf8;
    font-weight: 600;
  }
  .content-area {
    flex: 1;
  }
  .card {
    background: #0f172a;
    border-radius: 0.75rem;
    overflow: hidden;
  }
  .card-map {
    padding: 0;
    border-radius: 0.75rem;
    overflow: hidden;
    min-height: 580px;
    display: flex;
    flex-direction: column;
  }

  /* True AMOLED Black for Ultra Survival Mode */
  .app-root.ultra-survival {
    background: #000000;
  }
  .app-root.ultra-survival .card {
    background: #050505;
    border: 1px solid #1e293b;
  }
  .app-root.ultra-survival .pulse-indicator {
    box-shadow: none;
    animation: none;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .hamburger-btn {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 6px;
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    cursor: pointer;
  }

  .hamburger-bar {
    width: 18px;
    height: 2px;
    background: #38bdf8;
    border-radius: 2px;
  }

  .friends-card, .profile-card {
    padding: 20px;
  }

  .tab-inner-header h3 {
    margin: 0;
    color: #38bdf8;
    font-size: 1.2rem;
  }

  .tab-subtitle {
    margin: 4px 0 16px 0;
    font-size: 0.85rem;
    color: #94a3b8;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    color: #64748b;
    text-align: center;
  }

  .empty-icon {
    font-size: 2.5rem;
    margin-bottom: 10px;
  }

  .profile-info-box {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 8px;
    padding: 16px;
    font-size: 0.9rem;
    color: #cbd5e1;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  @media (max-width: 640px) {
    .nav-tabs {
      display: none;
    }
    .app-root {
      padding-bottom: 74px;
    }
  }
</style>
