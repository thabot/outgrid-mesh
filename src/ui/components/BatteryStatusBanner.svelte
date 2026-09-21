<script lang="ts">
  /**
   * Battery Status Banner & Ultra Survival Mode Switch
   * Sprint A: Survival Battery & Peer Distance
   * Creator & Lead Architect: Thabot <thabo47@gmail.com>
   * Protocol: TOG v1.1 Survival Power Model
   * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
   */
  import { onMount, createEventDispatcher } from 'svelte';
  import { BatteryRuntimeEstimator, type IBatteryRuntimeEstimate } from '../../core/battery/BatteryRuntimeEstimator';

  export let isUltraSurvival: boolean = false;
  export let onTriggerLastGasp: (() => void) | undefined = undefined;

  const dispatch = createEventDispatcher<{
    toggleSurvival: { enabled: boolean };
    lastGaspTriggered: void;
  }>();

  let batteryPercentage = 85;
  let isCharging = false;
  let estimate: IBatteryRuntimeEstimate = BatteryRuntimeEstimator.estimateRuntime(batteryPercentage, isCharging);

  // Read native browser battery status if supported
  async function initBatteryAPI() {
    try {
      if ('getBattery' in navigator) {
        const battery: any = await (navigator as any).getBattery();
        updateBatteryState(Math.round(battery.level * 100), battery.charging);

        battery.addEventListener('levelchange', () => {
          updateBatteryState(Math.round(battery.level * 100), battery.charging);
        });
        battery.addEventListener('chargingchange', () => {
          updateBatteryState(Math.round(battery.level * 100), battery.charging);
        });
      }
    } catch {
      // Graceful fallback for browsers without navigator.getBattery
    }
  }

  function updateBatteryState(pct: number, charging: boolean) {
    batteryPercentage = pct;
    isCharging = charging;
    // In ultra-survival mode, discharge rate drops significantly (up to 3x longer life)
    estimate = BatteryRuntimeEstimator.estimateRuntime(batteryPercentage, isCharging);
  }

  function toggleUltraSurvival() {
    isUltraSurvival = !isUltraSurvival;
    dispatch('toggleSurvival', { enabled: isUltraSurvival });
  }

  function handleLastGaspClick() {
    if (onTriggerLastGasp) {
      onTriggerLastGasp();
    }
    dispatch('lastGaspTriggered');
  }

  let showDetailedEstimate = false;

  function toggleDetailedEstimate() {
    showDetailedEstimate = !showDetailedEstimate;
  }

  onMount(() => {
    initBatteryAPI();
  });
</script>

<div class="battery-banner" class:ultra-active={isUltraSurvival} class:critical={estimate.isCriticalLastGasp}>
  <div class="battery-info">
    <button
      class="battery-icon-btn"
      on:click={toggleDetailedEstimate}
      aria-label="Toggle battery estimate"
      title="แตะเพื่อเปิด/ปิดแสดงเวลาที่ใช้งานได้อีก"
    >
      <span class="battery-icon">
        {#if isCharging}
          ⚡
        {:else if batteryPercentage > 60}
          🔋
        {:else if batteryPercentage > 20}
          🪫
        {:else}
          ⚠️
        {/if}
      </span>
    </button>
    <div class="battery-details">
      <span class="battery-text">
        <strong>{batteryPercentage}%</strong>
        {#if isCharging}
          {#if showDetailedEstimate}
            <span class="estimate-tag">(กำลังชาร์จไฟ)</span>
          {/if}
        {:else if showDetailedEstimate}
          {#if isUltraSurvival}
            <span class="estimate-tag">(ใช้ได้อีก ~{estimate.estimatedHours * 2} ชม.)</span>
          {:else}
            <span class="estimate-tag">(ใช้ได้อีก ~{estimate.estimatedHours} ชม. {estimate.estimatedMinutes} นาที)</span>
          {/if}
        {/if}
      </span>
      {#if estimate.isCriticalLastGasp}
        <span class="critical-warning">แบตเตอรี่วิกฤต (&le;5%) แนะนำส่ง Last-Gasp Beacon ก่อนเครื่องดับ</span>
      {/if}
    </div>
  </div>

  <div class="banner-actions">
    {#if estimate.isCriticalLastGasp}
      <button class="btn-last-gasp" on:click={handleLastGaspClick} title="ส่งพิกัดสุดท้ายให้เพื่อนบ้านก่อนเครื่องดับ">
        🚨 ส่ง Last-Gasp
      </button>
    {/if}
  </div>
</div>

<style>
  .battery-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 0.5rem;
    padding: 0.4rem 0.75rem;
    font-size: 0.78rem;
    color: #e2e8f0;
    margin-bottom: 0.6rem;
    gap: 0.4rem;
    flex-wrap: wrap;
    transition: all 0.2s ease;
  }

  .battery-banner.ultra-active {
    background: #050505;
    border-color: #38bdf8;
    box-shadow: 0 0 10px rgba(56, 189, 248, 0.2);
  }

  .battery-banner.critical {
    background: #450a0a;
    border-color: #ef4444;
    animation: critical-pulse 1.5s infinite;
  }

  .battery-icon-btn {
    background: transparent;
    border: none;
    padding: 0;
    margin: 0;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .battery-icon-btn:focus-visible {
    outline: 2px solid #38bdf8;
    border-radius: 4px;
  }
  .estimate-tag {
    color: #38bdf8;
    font-weight: 500;
  }
  .battery-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .battery-icon {
    font-size: 1.1rem;
  }

  .battery-details {
    display: flex;
    flex-direction: column;
  }

  .critical-warning {
    color: #fca5a5;
    font-size: 0.72rem;
    font-weight: 600;
  }

  .banner-actions {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .btn-toggle-survival {
    background: #1e293b;
    color: #38bdf8;
    border: 1px solid #0284c7;
    padding: 0.3rem 0.65rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn-toggle-survival:hover {
    background: #0284c7;
    color: #ffffff;
  }

  .btn-toggle-survival.active {
    background: #0284c7;
    color: #ffffff;
    box-shadow: 0 0 8px rgba(14, 165, 233, 0.6);
  }

  .btn-last-gasp {
    background: #ef4444;
    color: #ffffff;
    border: none;
    padding: 0.3rem 0.65rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
    animation: strobe-btn 1s infinite alternate;
  }

  @keyframes critical-pulse {
    0%, 100% { border-color: #ef4444; }
    50% { border-color: #7f1d1d; }
  }

  @keyframes strobe-btn {
    0% { transform: scale(1); }
    100% { transform: scale(1.05); }
  }
</style>
