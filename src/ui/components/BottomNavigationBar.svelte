<script lang="ts">
  /**
   * Bottom Navigation Bar Component (Sprint D Task D.2)
   * 5 Primary Tabs Thumb-Zone Optimized with Elevated SOS Action Button
   * Creator & Lead Architect: Thabot <thabo47@gmail.com>
   * Protocol: TOG v1.1 Emergency UI
   * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
   */
  import { createEventDispatcher } from 'svelte';
  import { i18n } from '../../core/i18n/I18nStore';

  export let activeTab: 'map' | 'chat' | 'sos' | 'friends' | 'profile' = 'sos';

  const translations = i18n.translations;

  const dispatch = createEventDispatcher<{
    tabChange: { tab: 'map' | 'chat' | 'sos' | 'friends' | 'profile' };
  }>();

  function selectTab(tab: 'map' | 'chat' | 'sos' | 'friends' | 'profile') {
    activeTab = tab;
    dispatch('tabChange', { tab });
  }
</script>

<nav class="bottom-nav-bar">
  <button
    class="nav-item"
    class:active={activeTab === 'map'}
    on:click={() => selectTab('map')}
    aria-label="Map"
  >
    <span class="icon">🗺️</span>
    <span class="label">{$translations.map || 'Map'}</span>
  </button>

  <button
    class="nav-item"
    class:active={activeTab === 'chat'}
    on:click={() => selectTab('chat')}
    aria-label="Chat"
  >
    <span class="icon">💬</span>
    <span class="label">{$translations.chat || 'Chat'}</span>
  </button>

  <button
    class="nav-item nav-sos"
    class:active={activeTab === 'sos'}
    on:click={() => selectTab('sos')}
    aria-label="SOS"
  >
    <div class="sos-pill">
      <span class="sos-icon">🚨</span>
      <span class="sos-label">{$translations.sos || 'SOS'}</span>
    </div>
  </button>

  <button
    class="nav-item"
    class:active={activeTab === 'friends'}
    on:click={() => selectTab('friends')}
    aria-label="Friends"
  >
    <span class="icon">👥</span>
    <span class="label">{$translations.friends || 'Friends'}</span>
  </button>

  <button
    class="nav-item"
    class:active={activeTab === 'profile'}
    on:click={() => selectTab('profile')}
    aria-label="Profile"
  >
    <span class="icon">👤</span>
    <span class="label">{$translations.profile || 'Profile'}</span>
  </button>
</nav>

<style>
  .bottom-nav-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 64px;
    background: #090f1d;
    border-top: 1px solid #1e293b;
    display: flex;
    justify-content: space-around;
    align-items: center;
    z-index: 50;
    max-width: 600px;
    margin: 0 auto;
    padding-bottom: env(safe-area-inset-bottom, 0);
  }

  .nav-item {
    background: none;
    border: none;
    color: #64748b;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 6px 0;
    flex: 1;
    transition: all 0.2s;
  }

  .nav-item .icon {
    font-size: 1.25rem;
    margin-bottom: 2px;
  }

  .nav-item .label {
    font-size: 0.7rem;
    font-weight: 500;
  }

  .nav-item:hover {
    color: #94a3b8;
  }

  .nav-item.active {
    color: #38bdf8;
  }

  .nav-item.active .label {
    font-weight: 700;
  }

  /* Elevated Center SOS Button */
  .nav-item.nav-sos {
    position: relative;
    top: -12px;
  }

  .sos-pill {
    width: 54px;
    height: 54px;
    border-radius: 50%;
    background: radial-gradient(circle, #ef4444 0%, #b91c1c 100%);
    border: 3px solid #fecaca;
    box-shadow: 0 4px 14px rgba(239, 68, 68, 0.5);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }

  .nav-item.nav-sos:active .sos-pill {
    transform: scale(0.92);
  }

  .sos-icon {
    font-size: 1.3rem;
    line-height: 1;
  }

  .sos-label {
    font-size: 0.6rem;
    font-weight: 900;
    color: #ffffff;
    letter-spacing: 0.5px;
  }
</style>