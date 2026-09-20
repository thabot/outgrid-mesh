<script lang="ts">
  import OneTapSos from '../ui/components/OneTapSos.svelte';
  import CrisisFeed from '../ui/components/CrisisFeed.svelte';
  import DonationDashboard from '../ui/components/DonationDashboard.svelte';
  import HelpManualScreen from '../ui/components/HelpManualScreen.svelte';
  import SosMapView from '../ui/components/SosMapView.svelte';

  let activeTab: 'sos' | 'feed' | 'map' | 'manual' | 'donation' = 'sos';

  // Dynamic version — injected by Vite from package.json / CI pipeline
  const appVersion: string = import.meta.env.VITE_APP_VERSION ?? '1.1.0';
  const commitSha: string = import.meta.env.VITE_APP_COMMIT ?? 'local';
  const versionLabel = `TOG v${appVersion} (${commitSha})`;

  // Demo SOS targets visible on the map
  const demoSosTargets = [
    { id: 'sos-001', lat: 13.7590, lng: 100.5050, category: '🚤 น้ำท่วม ต้องการเรือ', distanceMeters: 340 },
    { id: 'sos-002', lat: 18.7870, lng: 98.9830, category: '👶 มีเด็ก/ผู้สูงอายุ', distanceMeters: 1200 },
  ];
</script>

<svelte:head>
  <title>OutGrid Mesh - Emergency Grid</title>
  <meta name="description" content="Autonomous, Decentralized Spatial Mesh Communication Grid" />
</svelte:head>

<main class="app-root">
  <header class="app-header">
    <div class="logo">
      <span class="pulse-indicator"></span>
      <h1>OutGrid Mesh</h1>
      <span class="version-tag">{versionLabel}</span>
    </div>
    <nav class="nav-tabs">
      <button class:active={activeTab === 'sos'} on:click={() => activeTab = 'sos'}>🚨 SOS Beacon</button>
      <button class:active={activeTab === 'feed'} on:click={() => activeTab = 'feed'}>📢 Crisis Feed</button>
      <button class:active={activeTab === 'map'} on:click={() => activeTab = 'map'}>🗺️ แผนที่กู้ภัย</button>
      <button class:active={activeTab === 'manual'} on:click={() => activeTab = 'manual'}>📖 Field Manual</button>
      <button class:active={activeTab === 'donation'} on:click={() => activeTab = 'donation'}>🤝 Community Fund</button>
    </nav>
  </header>

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
    {/if}
  </section>
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
</style>
