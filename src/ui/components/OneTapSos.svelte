<script lang="ts">
  /**
   * One-Tap SOS Svelte Component (Mockup UI Alignment)
   * Emergency Category Chips + Pulsing SOS Round Button + Active Broadcasting Banner
   * Creator & Lead Architect: Thabot <thabo47@gmail.com>
   * Protocol: TOG v1.1 One-Tap SOS UI
   * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
   */
  import { createEventDispatcher } from 'svelte';
  import { SosStatusCategory } from '../../core/state/OneTapSosEngine';

  export let onTriggerSos: (category: SosStatusCategory) => void;
  export let isDispatching: boolean = false;

  const dispatch = createEventDispatcher<{
    viewBroadcast: void;
  }>();

  let selectedCategory: SosStatusCategory = SosStatusCategory.NEED_BOAT;
  let selectedCategoryLabel = '🌊 น้ำท่วมติดค้าง';
  let isSosActive = false;

  const categories = [
    { id: SosStatusCategory.NEED_BOAT, label: '🌊 น้ำท่วมติดค้าง' },
    { id: SosStatusCategory.TRAPPED_RUBBLE, label: '🏚️ ติดใต้ซากอาคาร' },
    { id: SosStatusCategory.GENERAL_EMERGENCY, label: '🩺 บาดเจ็บสาหัส' },
    { id: SosStatusCategory.OXYGEN_DEPLETION, label: '🔥 ไฟไหม้/ควัน' },
    { id: SosStatusCategory.VULNERABLE_CHILD_ELDERLY, label: '👶 มีเด็ก/คนชรา' },
  ];

  function selectCategory(cat: { id: SosStatusCategory; label: string }) {
    selectedCategory = cat.id;
    selectedCategoryLabel = cat.label;
  }

  function handleSosClick() {
    isSosActive = true;
    if (onTriggerSos) {
      onTriggerSos(selectedCategory);
    }
  }

  function cancelSos() {
    isSosActive = false;
    alert('🛑 ยกเลิกการแพร่สัญญาณ SOS เรียบร้อยแล้ว');
  }
</script>

<div class="screen-sos-container">
  <span class="sos-icon-large">🚨</span>
  <h2 class="sos-title">ระบบแจ้งเหตุฉุกเฉิน One-Tap SOS</h2>
  <p class="sos-desc">
    กดปุ่มด้านล่างเพื่อกระจายพิกัด GPS ออฟไลน์ฉุกเฉินทะลุทุกรัศมี Geofence ผ่านโหนดวิทยุรอบตัว 15 Hops และส่งข้อความเข้าห้องแชตสาธารณะอัตโนมัติ
  </p>

  <!-- Active SOS Status Banner -->
  {#if isSosActive}
    <div class="sos-active-banner">
      <div class="active-banner-header">
        <span class="active-status-text">● สัญญาณ SOS กำลังแพร่กระจายสด (15 Hops)</span>
        <span class="active-badge">BROADCASTING</span>
      </div>
      <p class="active-banner-sub">พิกัดและข้อความฉุกเฉินถูกส่งขึ้นห้องแชตสาธารณะและบันทึกลงเครื่องแล้ว</p>
      <div class="active-banner-actions">
        <button class="btn-banner-view" on:click={() => dispatch('viewBroadcast')}>
          📢 ดูในแชตสาธารณะ
        </button>
        <button class="btn-banner-cancel" on:click={cancelSos}>
          🛑 ยกเลิกสัญญาณ SOS
        </button>
      </div>
    </div>
  {/if}

  <!-- Emergency Category Chips -->
  <div class="category-chips-row">
    {#each categories as cat}
      <button
        class="quick-chip"
        class:active={selectedCategory === cat.id}
        on:click={() => selectCategory(cat)}
      >
        {cat.label}
      </button>
    {/each}
  </div>

  <!-- Big Round SOS Button -->
  <button
    id="sos-main-btn"
    class="sos-main-btn"
    class:loading={isDispatching}
    disabled={isDispatching}
    on:click={handleSosClick}
  >
    {#if isDispatching}
      <span>📡 กำลังยิงวิทยุ...</span>
    {:else}
      <span>🚨 กดส่ง SOS</span>
    {/if}
  </button>

  <span class="selected-cat-hint">
    หมวดหมู่ที่เลือก: <b class="selected-cat-name">{selectedCategoryLabel}</b>
  </span>
  <span class="offline-guarantee-hint">
    (พร้อมทำงานออฟไลน์ 100% แม้ไม่มีเน็ตหรือเสาสัญญาณ)
  </span>
</div>

<style>
  .screen-sos-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px 20px;
    min-height: 520px;
    text-align: center;
    background: #0f172a;
  }
  .sos-icon-large {
    font-size: 54px;
    margin-bottom: 12px;
  }
  .sos-title {
    color: #ef4444;
    margin-bottom: 8px;
    font-size: 20px;
    font-weight: 800;
  }
  .sos-desc {
    font-size: 12px;
    color: #94a3b8;
    max-width: 400px;
    margin-bottom: 18px;
    line-height: 1.5;
  }
  .sos-active-banner {
    width: 100%;
    max-width: 400px;
    background: rgba(220, 38, 38, 0.2);
    border: 1px solid #ef4444;
    border-radius: 8px;
    padding: 10px;
    margin-bottom: 16px;
    text-align: left;
  }
  .active-banner-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4px;
  }
  .active-status-text {
    color: #f87171;
    font-weight: 800;
    font-size: 12px;
  }
  .active-badge {
    background: #dc2626;
    color: #fff;
    font-size: 9px;
    font-weight: 900;
    padding: 2px 6px;
    border-radius: 3px;
  }
  .active-banner-sub {
    color: #fecaca;
    font-size: 11px;
    margin-bottom: 8px;
  }
  .active-banner-actions {
    display: flex;
    gap: 8px;
  }
  .btn-banner-view {
    flex: 1;
    background: #0284c7;
    color: #fff;
    border: none;
    padding: 6px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
  }
  .btn-banner-cancel {
    flex: 1;
    background: #334155;
    color: #cbd5e1;
    border: 1px solid #475569;
    padding: 6px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
  }

  /* Category Chips */
  .category-chips-row {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    justify-content: center;
    max-width: 440px;
    margin-bottom: 18px;
  }
  .quick-chip {
    background: #1e293b;
    color: #cbd5e1;
    border: 1px solid #334155;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .quick-chip:hover {
    background: #334155;
    border-color: #38bdf8;
    color: #ffffff;
  }
  .quick-chip.active {
    background: #0284c7;
    border-color: #38bdf8;
    color: #ffffff;
    box-shadow: 0 0 8px rgba(56, 189, 248, 0.4);
  }

  /* Big SOS Button */
  .sos-main-btn {
    background: linear-gradient(135deg, #dc2626, #991b1b);
    color: #fff;
    border: 2px solid #f87171;
    width: 180px;
    height: 180px;
    border-radius: 50%;
    font-size: 22px;
    font-weight: 900;
    box-shadow: 0 0 30px rgba(220, 38, 38, 0.6);
    cursor: pointer;
    transition: transform 0.1s ease, box-shadow 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .sos-main-btn:hover {
    box-shadow: 0 0 40px rgba(220, 38, 38, 0.85);
  }
  .sos-main-btn:active {
    transform: scale(0.95);
  }
  .sos-main-btn:disabled, .sos-main-btn.loading {
    background: #450a0a;
    border-color: #7f1d1d;
    cursor: wait;
  }

  .selected-cat-hint {
    margin-top: 14px;
    font-size: 11px;
    color: #94a3b8;
  }
  .selected-cat-name {
    color: #38bdf8;
  }
  .offline-guarantee-hint {
    margin-top: 4px;
    font-size: 10px;
    color: #64748b;
  }
</style>
