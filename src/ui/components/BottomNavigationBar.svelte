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
  export let unreadCount: number = 0;

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
    <div class="chat-icon-container">
      <span class="icon">💬</span>
      {#if unreadCount > 0}
        <span class="nav-unread-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
      {/if}
    </div>
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
    padding: 6px 4px;
    margin-top: 0.4rem;
    border-radius: 0.5rem;
    flex-shrink: 0;
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
  .chat-icon-container {
    position: relative;
    display: inline-flex;
    justify-content: center;
    align-items: center;
  }
  .nav-unread-badge {
    position: absolute;
    top: -6px;
    right: -10px;
    background: #ef4444;
    color: #ffffff;
    font-size: 9px;
    font-weight: 800;
    min-width: 15px;
    height: 15px;
    line-height: 15px;
    border-radius: 9999px;
    padding: 0 4px;
    text-align: center;
    box-shadow: 0 0 6px rgba(239, 68, 68, 0.6);
  }
  .icon {
    font-size: 16px;
  }
</style>