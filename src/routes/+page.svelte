<script lang="ts">
  import { base } from '$app/paths';
  import 'leaflet/dist/leaflet.css';
  import OneTapSos from '../ui/components/OneTapSos.svelte';
  import CrisisFeed from '../ui/components/CrisisFeed.svelte';
  import DonationDashboard from '../ui/components/DonationDashboard.svelte';
  import HelpManualScreen from '../ui/components/HelpManualScreen.svelte';
  import SosMapView from '../ui/components/SosMapView.svelte';
  import NetworkStatusBar from '../ui/components/NetworkStatusBar.svelte';
  import BottomNavigationBar from '../ui/components/BottomNavigationBar.svelte';
  import HamburgerDrawer from '../ui/components/HamburgerDrawer.svelte';
  import RescueRadarHud from '../ui/components/RescueRadarHud.svelte';
  import { onMount, onDestroy } from 'svelte';
  import MeshChatScreen from '../ui/components/MeshChatScreen.svelte';
  import FriendsScreen from '../ui/components/FriendsScreen.svelte';
  import IncomingSosBanner, { type IIncomingSosAlert } from '../ui/components/IncomingSosBanner.svelte';
  import AuthProfileScreen from '../ui/components/AuthProfileScreen.svelte';
  import { i18n } from '../core/i18n/I18nStore';
  import {
    discoveredPeersStore,
    peerCountsStore,
    peerDiscoveryManager
  } from '../core/state/PeerDiscoveryStore';
  import { AuthManager } from '../core/auth/AuthManager';
  import { OneTapSosEngine, SosStatusCategory } from '../core/state/OneTapSosEngine';
  import { NativeBridgeDispatcher } from '../core/native/NativeBridgeDispatcher';
  import { PacketSerializer } from '../core/protocol/PacketSerializer';
  import { TOGPacketType } from '../core/protocol/TOGPacket';
  import { H3DeltaCompressor } from '../core/spatial/H3DeltaCompressor';

  const translations = i18n.translations;

  let activeTab: 'map' | 'sos' | 'chat' | 'manual' | 'feed' | 'donation' | 'friends' | 'profile' = 'map';
  let isUltraSurvival = false;
  let isDrawerOpen = false;
  let showBatteryModal = false;
  let isBatteryBannerDismissed = false;
  let activeRadarTarget: any = null;
  let incomingSosBannerRef: IncomingSosBanner;

  // Dynamic version label
  const appVersion: string = import.meta.env.VITE_APP_VERSION ?? '1.1.0';
  const commitSha: string = import.meta.env.VITE_APP_COMMIT ?? 'local';
  const versionLabel = `TOG v1.1 Wire`;

  let auth = new AuthManager();
  let myProfile = auth.getProfile();
  let targetChatPeer: { peerId: string; peerName: string } | null = null;
  let isSosDispatching = false;
  let unsubscribeRadioSos: (() => void) | null = null;

  // Real SOS targets visible on the map
  const demoSosTargets: Array<{
    id: string;
    lat: number;
    lng: number;
    category: string;
    distanceMeters?: number;
    floor?: number;
  }> = [];

  function openRadarForTarget(target: any) {
    activeRadarTarget = target;
  }

  function handleBottomTabChange(e: CustomEvent<{ tab: 'map' | 'chat' | 'sos' | 'manual' | 'friends' | 'profile' }>) {
    activeTab = e.detail.tab;
  }

  function handleStartDirectChat(e: CustomEvent<{ peerId: string; peerName: string }>) {
    targetChatPeer = { peerId: e.detail.peerId, peerName: e.detail.peerName };
    activeTab = 'chat';
  }

  function handleIncomingSosRadio(bytes: Uint8Array, rssi: number) {
    if (bytes.length < 5) return;
    if (bytes[0] === 0x54 && bytes[1] === 0x4F) {
      const pType = bytes[2] & 0x1f;
      if (pType === TOGPacketType.SOS_BEACON) {
        try {
          const packet = PacketSerializer.deserialize(bytes);
          let senderHex = Array.from(packet.senderPubkeyHash).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 4).toUpperCase();
          if (!senderHex) senderHex = 'NODE';
          const senderNodeId = `#${senderHex}`;

          const myPubHex = Array.from(myProfile.keyPair.publicKey).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 4).toUpperCase();
          if (senderHex === myPubHex) return;

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

          incomingSosBannerRef?.handleIncomingSosPacket(alertObj);

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

  function handleTriggerSos(category: SosStatusCategory = SosStatusCategory.IMMEDIATE_ASSISTANCE) {
    if (isSosDispatching) return;
    isSosDispatching = true;

    try {
      let currentLat = 13.7563;
      let currentLng = 100.5018;

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

      const wireBytes = PacketSerializer.serialize(sosPacket);
      const dispatcher = NativeBridgeDispatcher.getInstance();
      dispatcher.transmitRadioPacket(wireBytes, true);
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

  function handlePanic() {
    handleTriggerSos(SosStatusCategory.IMMEDIATE_ASSISTANCE);
  }

  function toggleSurvivalMode() {
    isUltraSurvival = !isUltraSurvival;
  }

  onMount(() => {
    myProfile = auth.getProfile();
    let numericNodeId = 0x47A1;
    try {
      const parsed = parseInt(myProfile.nodeId.slice(0, 4), 16);
      if (!isNaN(parsed) && parsed > 0) {
        numericNodeId = parsed;
      }
    } catch {}

    peerDiscoveryManager.startPresenceBroadcaster(numericNodeId);

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
  <title>OutGrid Mesh - Tactical Disaster Mesh UI</title>
  <meta name="description" content="Autonomous, Decentralized Spatial Mesh Communication Grid" />
</svelte:head>

<main class="app-root" class:ultra-survival={isUltraSurvival}>
  <HamburgerDrawer
    bind:isOpen={isDrawerOpen}
    {appVersion}
    {commitSha}
  />

  <!-- 1. App Header (Exact Match to Mockup) -->
  <header class="app-header">
    <div class="header-left">
      <button class="hamburger-btn" on:click={() => isDrawerOpen = true} aria-label="เปิดเมนูหลัก" title="เปิดเมนูหลัก">
        <span class="hamburger-bar"></span>
        <span class="hamburger-bar"></span>
        <span class="hamburger-bar"></span>
      </button>
      <div class="logo">
        <div class="brand-logo-box">OG</div>
        <span class="pulse-indicator"></span>
        <h1>OutGrid Mesh</h1>
      </div>
    </div>
    <div class="header-right">
      <span>{versionLabel}</span>
    </div>
  </header>

  <!-- 2. Battery Exemption Alert Banner (Mockup Banner) -->
  {#if !isBatteryBannerDismissed}
    <div class="battery-exemption-banner">
      <div>
        <span>⚡ <b>แนะนำ:</b> ตั้งค่าเป็น <u>ไม่จำกัดแบตเตอรี่ (Unrestricted)</u> เพื่อให้รับส่งข้อความกู้ภัยได้ตลอด 24/7</span>
      </div>
      <button class="btn-exemption" on:click={() => showBatteryModal = true}>ตั้งค่าระบบ</button>
    </div>
  {/if}

  <!-- Real-time Incoming SOS Alert Banner -->
  <IncomingSosBanner
    bind:this={incomingSosBannerRef}
    on:openRadar={(e) => openRadarForTarget(e.detail.target)}
  />

  <!-- 3. Unified Status & Emergency Quick Control Bar -->
  <NetworkStatusBar
    peerCounts={$peerCountsStore}
    on:panic={handlePanic}
    on:toggleSurvival={toggleSurvivalMode}
  />

  <!-- 4. Content Area -->
  <section class="content-area">
    <div class="card" class:card-map={activeTab === 'map'}>
      <!-- 🗺️ Tactical Map View -->
      {#if activeTab === 'map'}
        <SosMapView
          sosTargets={demoSosTargets}
          peerNodes={$discoveredPeersStore}
          on:openRadar={(e) => openRadarForTarget(e.detail.target)}
          on:startDirectChat={(e) => {
            targetChatPeer = { peerId: e.detail.peerId, peerName: e.detail.peerName };
            activeTab = 'chat';
          }}
        />
      {:else if activeTab === 'sos'}
        <OneTapSos onTriggerSos={handleTriggerSos} isDispatching={isSosDispatching} on:viewBroadcast={() => activeTab = 'chat'} />
      {:else if activeTab === 'chat'}
        <MeshChatScreen targetContact={targetChatPeer} myNodeId={myProfile.nodeId} />
      {:else if activeTab === 'manual'}
        <HelpManualScreen />
      {:else if activeTab === 'feed'}
        <CrisisFeed />
      {:else if activeTab === 'donation'}
        <DonationDashboard />
      {:else if activeTab === 'friends'}
        <div class="friends-card">
          <FriendsScreen on:startDirectChat={handleStartDirectChat} />
        </div>
      {:else if activeTab === 'profile'}
        <div class="profile-card">
          <AuthProfileScreen />
        </div>
      {/if}
    </div>
  </section>

  <!-- 5. Bottom Navigation Bar -->
  <BottomNavigationBar
    activeTab={activeTab === 'feed' ? 'chat' : (activeTab === 'donation' || activeTab === 'profile' ? 'manual' : (activeTab as any))}
    on:tabChange={handleBottomTabChange}
  />

  <!-- Tactical Rescue Radar HUD Overlay -->
  {#if activeRadarTarget}
    <RescueRadarHud
      target={activeRadarTarget}
      on:close={() => activeRadarTarget = null}
    />
  {/if}

  <!-- Battery Exemption Modal -->
  {#if showBatteryModal}
    <div
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="ปลดล็อกแบตเตอรี่"
      tabindex="-1"
      on:click={() => showBatteryModal = false}
      on:keydown={(e) => e.key === 'Escape' && (showBatteryModal = false)}
    >
      <div
        class="modal-card"
        role="document"
        tabindex="0"
        on:click|stopPropagation
        on:keydown|stopPropagation
      >
        <div class="modal-header">
          <span style="color: #f59e0b; font-weight: 800;">⚡ ปลดล็อกแบตเตอรี่ (Unrestricted)</span>
          <button class="btn-close-modal" on:click={() => showBatteryModal = false}>✕</button>
        </div>
        <div class="modal-body-guide">
          <p style="margin-bottom: 8px;">เพื่อให้รับส่งสัญญาณกู้ภัยเบื้องหลัง 24/7 ได้ตลอดเวลา กรุณาตั้งค่าตามรุ่นมือถือ:</p>
          <div class="guide-box">
            <b>📱 Samsung:</b> การตั้งค่า > แอป > OutGrid Mesh > แบตเตอรี่ > <b>ไม่จำกัด</b>
          </div>
          <div class="guide-box">
            <b>📱 Xiaomi:</b> การตั้งค่า > จัดการแอป > ประหยัดแบตเตอรี่ > <b>ไม่มีข้อจำกัด</b>
          </div>
          <div class="guide-box">
            <b>📱 OPPO / Vivo / Realme:</b> การตั้งค่า > การจัดการแอป > เริ่มต้นอัตโนมัติ > <b>เปิด</b>
          </div>
          <div class="guide-box">
            <b>📱 Huawei:</b> การตั้งค่า > แบตเตอรี่ > การเปิดใช้แอป > OutGrid Mesh > <b>จัดการด้วยตนเอง</b>
          </div>
          <div class="guide-buttons">
            <button class="btn-guide-config" on:click={() => alert('เปิดการตั้งค่าแอปในระบบ Android...')}>
              ⚙️ เปิดหน้าต่างตั้งค่าระบบ Android ทันที
            </button>
            <button class="btn-guide-dismiss" on:click={() => { isBatteryBannerDismissed = true; showBatteryModal = false; }}>
              ✅ ฉันตั้งค่าเรียบร้อยแล้ว (ปิดแถบเตือนนี้)
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}
</main>

<style>
  :global(*) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  :global(body) {
    background: #090d16;
    color: #f1f5f9;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    display: flex;
    justify-content: center;
    padding: 12px;
  }
  .app-root {
    max-width: 900px;
    width: 100%;
    min-height: 95vh;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  /* App Header */
  .app-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #1e293b;
    padding-bottom: 0.65rem;
    margin-bottom: 0.65rem;
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
  .logo {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .brand-logo-box {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    background: linear-gradient(135deg, #0284c7, #0369a1);
    border: 1px solid #0284c7;
    box-shadow: 0 0 10px rgba(56, 189, 248, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 900;
    font-size: 16px;
    color: #fff;
  }
  .logo h1 {
    margin: 0;
    font-size: 1.35rem;
    color: #38bdf8;
    font-weight: 800;
    letter-spacing: -0.5px;
  }
  .pulse-indicator {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #22c55e;
    box-shadow: 0 0 10px #22c55e;
  }
  .header-right {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: #64748b;
  }

  /* Battery Exemption Guide Banner */
  .battery-exemption-banner {
    background: rgba(120, 53, 15, 0.35);
    border: 1px solid rgba(245, 158, 11, 0.4);
    border-radius: 0.5rem;
    padding: 0.4rem 0.75rem;
    margin-bottom: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.75rem;
    color: #fef3c7;
  }
  .btn-exemption {
    background: #f59e0b;
    color: #0f172a;
    border: none;
    font-weight: 800;
    font-size: 0.7rem;
    padding: 3px 8px;
    border-radius: 4px;
    cursor: pointer;
  }

  /* Content Area */
  .content-area {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  .card {
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 0.75rem;
    overflow: hidden;
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  .card-map {
    min-height: 560px;
  }

  .friends-card, .profile-card {
    padding: 20px;
  }

  /* Ultra Survival Mode (True AMOLED Black) */
  .app-root.ultra-survival {
    background: #000000;
  }
  .app-root.ultra-survival .card {
    background: #050505;
    border-color: #1e293b;
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 16px;
    backdrop-filter: blur(4px);
  }
  .modal-card {
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 12px;
    max-width: 440px;
    width: 100%;
    padding: 16px;
    color: #f1f5f9;
  }
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #1e293b;
    padding-bottom: 8px;
    margin-bottom: 12px;
    font-size: 13px;
  }
  .btn-close-modal {
    background: transparent;
    border: none;
    color: #94a3b8;
    font-size: 16px;
    cursor: pointer;
  }
  .modal-body-guide {
    font-size: 11px;
    line-height: 1.6;
    color: #cbd5e1;
  }
  .guide-box {
    background: #1e293b;
    padding: 8px;
    border-radius: 6px;
    margin-bottom: 6px;
    border: 1px solid #334155;
  }
  .guide-buttons {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 10px;
  }
  .btn-guide-config {
    width: 100%;
    background: #f59e0b;
    color: #0f172a;
    border: none;
    padding: 8px;
    border-radius: 6px;
    font-weight: 800;
    font-size: 12px;
    cursor: pointer;
  }
  .btn-guide-dismiss {
    width: 100%;
    background: #059669;
    color: #fff;
    border: none;
    padding: 8px;
    border-radius: 6px;
    font-weight: 800;
    font-size: 12px;
    cursor: pointer;
  }
</style>
