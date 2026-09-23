<script lang="ts">
  /**
   * Bottom Navigation Bar Component (Mockup UI Alignment)
   * Creator & Lead Architect: Thabot <thabo47@gmail.com>
   * Protocol: TOG v1.1 Emergency UI
   * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
   */
  import { createEventDispatcher } from 'svelte';
  import { i18n } from '../../core/i18n/I18nStore';

  export let activeTab: 'map' | 'chat' | 'sos' | 'manual' | 'friends' | 'profile' = 'sos';

  const translations = i18n.translations;

  const dispatch = createEventDispatcher<{
    tabChange: { tab: 'map' | 'chat' | 'sos' | 'manual' | 'friends' | 'profile' };
  }>();

  function selectTab(tab: 'map' | 'chat' | 'sos' | 'manual' | 'friends' | 'profile') {
    activeTab = tab;
    dispatch('tabChange', { tab });
  }
</script>

<nav class="bottom-nav">
  <button
    id="bnav-map"
    class:active={activeTab === 'map'}
    on:click={() => selectTab('map')}
    aria-label="Map"
  >
    <span class="icon">🗺️</span>
    <span>{$translations.map || 'แผนที่'}</span>
  </button>

  <button
    id="bnav-sos"
    class:active={activeTab === 'sos'}
    on:click={() => selectTab('sos')}
    aria-label="SOS"
  >
    <span class="icon">🚨</span>
    <span>{$translations.sos || 'SOS'}</span>
  </button>

  <button
    id="bnav-chat"
    class:active={activeTab === 'chat' || activeTab === 'friends'}
    on:click={() => selectTab('chat')}
    aria-label="Chat"
  >
    <span class="icon">💬</span>
    <span>{$translations.chat || 'แชต & เพื่อน'}</span>
  </button>

  <button
    id="bnav-manual"
    class:active={activeTab === 'manual'}
    on:click={() => selectTab('manual')}
    aria-label="Manual"
  >
    <span class="icon">📖</span>
    <span>{$translations.manual || 'คู่มือ'}</span>
  </button>
</nav>

<style>
  .bottom-nav {
    background: #0f172a;
    border: 1px solid #1e293b;
    border-top: 1px solid #1e293b;
    display: flex;
    justify-content: space-around;
    padding: 8px 4px;
    margin-top: 0.75rem;
    border-radius: 0.5rem;
  }
  .bottom-nav button {
    background: transparent;
    border: none;
    color: #94a3b8;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    padding: 4px 12px;
    border-radius: 6px;
    transition: all 0.15s ease;
  }
  .bottom-nav button:hover {
    color: #f1f5f9;
  }
  .bottom-nav button.active {
    color: #38bdf8;
    background: rgba(56, 189, 248, 0.1);
    font-weight: 700;
  }
  .icon {
    font-size: 16px;
  }
</style>