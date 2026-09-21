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

  function handleStartDirectChat(e: CustomEvent<{ peerId: string; peerName: string }>) {
    activeTab = 'chat';
  }

  onMount(() => {
    // Automatically start periodic BLE Presence broadcasting on launch
    peerDiscoveryManager.startPresenceBroadcaster();
  });

  onDestroy(() => {
    peerDiscoveryManager.stopPresenceBroadcaster();
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

      <div class="header-lang-selector">
        <label for="header-lang-select" class="lang-icon">🌐</label>
        <select id="header-lang-select" value={$currentLocaleStore} on:change={handleLanguageChange} aria-label="เลือกภาษา">
          {#each SUPPORTED_LOCALES as loc}
            <option value={loc.code}>{loc.flag} {loc.name}</option>
          {/each}
        </select>
      </div>
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
      <div class="card"><OneTapSos /></div>
    {:else if activeTab === 'feed'}
      <div class="card"><CrisisFeed /></div>
    {:else if activeTab === 'chat'}
      <div class="card"><MeshChatScreen /></div>
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
