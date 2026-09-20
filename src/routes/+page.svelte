<script lang="ts">
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

  let activeTab: 'sos' | 'feed' | 'map' | 'manual' | 'donation' | 'friends' | 'profile' = 'sos';
  let isUltraSurvival = false;
  let isDrawerOpen = false;

  // Dynamic version — injected by Vite from package.json / CI pipeline
  const appVersion: string = import.meta.env.VITE_APP_VERSION ?? '1.1.0';
  const commitSha: string = import.meta.env.VITE_APP_COMMIT ?? 'local';
  const versionLabel = `TOG v${appVersion} (${commitSha})`;

  // Demo SOS targets visible on the map
  const demoSosTargets = [
    { id: 'sos-001', lat: 13.7590, lng: 100.5050, category: '🚤 น้ำท่วม ต้องการเรือ', distanceMeters: 340 },
    { id: 'sos-002', lat: 18.7870, lng: 98.9830, category: '👶 มีเด็ก/ผู้สูงอายุ', distanceMeters: 1200 },
  ];

  function handleTriggerLastGasp() {
    alert('🚨 Last-Gasp Beacon ถูกส่งผ่านคลื่นวิทยุแล้ว! พิกัดสุดท้ายและเวลาได้ถูกฝากไว้กับเพื่อนบ้านรอบตัวก่อนเครื่องดับ');
  }

  function handleBottomTabChange(e: CustomEvent<{ tab: 'map' | 'chat' | 'sos' | 'friends' | 'profile' }>) {
    const tab = e.detail.tab;
    if (tab === 'chat') {
      activeTab = 'feed';
    } else {
      activeTab = tab;
    }
  }
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
        <img src="/logo.png" alt="OutGrid Mesh Logo" class="brand-logo-img" />
        <span class="pulse-indicator"></span>
        <h1>OutGrid Mesh</h1>
        <span class="version-tag">{versionLabel}</span>
      </div>
    </div>
    <nav class="nav-tabs">
      <button class:active={activeTab === 'sos'} on:click={() => activeTab = 'sos'}>🚨 SOS Beacon</button>
      <button class:active={activeTab === 'feed'} on:click={() => activeTab = 'feed'}>📢 Crisis Feed</button>
      <button class:active={activeTab === 'map'} on:click={() => activeTab = 'map'}>🗺️ แผนที่กู้ภัย</button>
      <button class:active={activeTab === 'manual'} on:click={() => activeTab = 'manual'}>📖 Field Manual</button>
      <button class:active={activeTab === 'donation'} on:click={() => activeTab = 'donation'}>🤝 Community Fund</button>
    </nav>
  </header>

  <!-- Network Status Bar (Sprint D Task D.1) -->
  <NetworkStatusBar />

  <BatteryStatusBanner
    bind:isUltraSurvival
    onTriggerLastGasp={handleTriggerLastGasp}
  />

  <BeaconControlsBar />

  <section class="content-area">
    {#if activeTab === 'sos'}
      <div class="card"><OneTapSos /></div>
    {:else if activeTab === 'feed'}
      <div class="card"><CrisisFeed /></div>
    {:else if activeTab === 'map'}
      <div class="card card-map"><SosMapView sosTargets={demoSosTargets} /></div>
    {:else if activeTab === 'manual'}
      <div class="card"><HelpManualScreen /></div>
    {:else if activeTab === 'donation'}
      <div class="card"><DonationDashboard /></div>
    {:else if activeTab === 'friends'}
      <div class="card friends-card">
        <div class="tab-inner-header">
          <h3>👥 เพื่อนและผู้ติดต่อรอบตัว</h3>
          <p class="tab-subtitle">รายชื่อและสถานะสัญญาณวิทยุของโหนดที่บันทึกไว้ในรัศมี Mesh</p>
        </div>
        <div class="empty-state">
          <span class="empty-icon">📡</span>
          <p>เปิดสแกนหาเพื่อนในระยะวิทยุ หรือสแกน QR Code เพื่อเพิ่มเพื่อน</p>
        </div>
      </div>
    {:else if activeTab === 'profile'}
      <div class="card profile-card">
        <div class="tab-inner-header">
          <h3>👤 โปรไฟล์และตัวตนในเครือข่าย</h3>
          <p class="tab-subtitle">การจัดการความปลอดภัยและคู่กุญแจ Ed25519 / X25519</p>
        </div>
        <div class="profile-info-box">
          <p><strong>Identity:</strong> Self-Sovereign Cryptographic Keypair</p>
          <p><strong>Privacy Mode:</strong> ไร้ชื่อจริง ไม่ติดตามตัวตน ข้อมูลไม่ผูกมัดบัตรประชาชน</p>
        </div>
      </div>
    {/if}
  </section>

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
    padding-bottom: 1rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    gap: 1rem;
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
