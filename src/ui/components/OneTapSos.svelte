<script lang="ts">
  /**
   * One-Tap SOS Svelte Component
   * High-contrast single-tap emergency beacon button with status categories
   * Creator & Lead Architect: Thabot <thabo47@gmail.com>
   * Protocol: TOG v1.1 One-Tap SOS UI
   * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
   */
  import { SosStatusCategory } from '../../core/state/OneTapSosEngine';

  export let onTriggerSos: (category: SosStatusCategory) => void;
  export let isDispatching: boolean = false;

  let selectedCategory: SosStatusCategory = SosStatusCategory.GENERAL_EMERGENCY;

  const categories = [
    { id: SosStatusCategory.GENERAL_EMERGENCY, label: '🚨 ขอความช่วยเหลือทั่วไป' },
    { id: SosStatusCategory.TRAPPED_RUBBLE, label: '🏚️ ติดอยู่ใต้ซากตึก' },
    { id: SosStatusCategory.VULNERABLE_CHILD_ELDERLY, label: '👶 มีเด็ก / ผู้สูงอายุ' },
    { id: SosStatusCategory.NEED_BOAT, label: '🚤 น้ำท่วม ต้องการเรือ' },
    { id: SosStatusCategory.OXYGEN_DEPLETION, label: '🫁 ขาดออกซิเจน' },
  ];

  function handleSosClick() {
    if (onTriggerSos) {
      onTriggerSos(selectedCategory);
    }
  }
</script>

<div class="sos-container">
  <div class="category-selector">
    <label for="sos-cat">สถานะวิกฤต:</label>
    <select id="sos-cat" bind:value={selectedCategory}>
      {#each categories as cat}
        <option value={cat.id}>{cat.label}</option>
      {/each}
    </select>
  </div>

  <button
    class="sos-big-button"
    class:loading={isDispatching}
    disabled={isDispatching}
    on:click={handleSosClick}
  >
    {#if isDispatching}
      <span>📡 กำลังยิงสัญญาณฉุกเฉิน...</span>
    {:else}
      <span class="sos-text">🚨 ONE-TAP SOS</span>
      <span class="sos-subtext">กดครั้งเดียวยิงพิกัดผ่านคลื่นวิทยุทันที</span>
    {/if}
  </button>
</div>

<style>
  .sos-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 24px;
    gap: 16px;
  }
  .category-selector select {
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid #cbd5e1;
    font-size: 15px;
    margin-left: 8px;
  }
  .sos-big-button {
    width: 260px;
    height: 260px;
    border-radius: 50%;
    background: radial-gradient(circle, #ef4444 0%, #b91c1c 100%);
    color: #ffffff;
    border: 6px solid #fecaca;
    box-shadow: 0 10px 25px -5px rgba(239, 68, 68, 0.5);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    transition: transform 0.1s ease;
  }
  .sos-big-button:active {
    transform: scale(0.96);
  }
  .sos-text {
    font-size: 28px;
    font-weight: 900;
    letter-spacing: 1px;
  }
  .sos-subtext {
    font-size: 12px;
    margin-top: 6px;
    opacity: 0.9;
  }
</style>
