<script lang="ts">
  /**
   * Unified Network Status & Emergency Controls Bar (Sprint D Task D.1 & Phase 7 UI Alignment)
   * Creator & Lead Architect: Thabot <thabo47@gmail.com>
   * Protocol: TOG v1.1 Autonomous Mode Transition
   * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
   */
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { ModeStateMachine, AppOperatingMode } from '../../core/state/ModeStateMachine';
  import { BatteryRuntimeEstimator, type IBatteryRuntimeEstimate } from '../../core/battery/BatteryRuntimeEstimator';
  import { i18n } from '../../core/i18n/I18nStore';
  import { peerDiscoveryManager } from '../../core/state/PeerDiscoveryStore';
  import { NativeBridgeDispatcher } from '../../core/native/NativeBridgeDispatcher';

  export let stateMachine: ModeStateMachine = new ModeStateMachine(AppOperatingMode.NORMAL_CLOUD);
  export let peerCounts = {
    sos: 0,
    friends: 0,
    relays: 0,
    gateways: 0,
    total: 0
  };

  const translations = i18n.translations;
  const dispatch = createEventDispatcher<{
    panic: void;
    toggleSurvival: void;
  }>();

  let currentMode: AppOperatingMode = stateMachine.getOperatingMode();
  let networkType: '5g_4g' | 'wifi' | 'disaster_mesh' | 'isolated' = '5g_4g';
  let batteryPct = 85;
  let isCharging = false;
  let batteryEstimate: IBatteryRuntimeEstimate = BatteryRuntimeEstimator.estimateRuntime(batteryPct, isCharging);
  let showPeerModal = false;
  let showBatteryModal = false;
  let graceCountdown = 0;
  let graceTimer: any = null;
  let unsubscribeState: (() => void) | null = null;

  let probeTimer: any = null;
  let isProbing = false;

  // Emergency Beacon Controls State
  let isFlashlightActive = false;
  let isSirenActive = false;
  let isStealthActive = false;
  let isUltraSurvival = false;

  async function checkActiveInternet(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return false;
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      await fetch(`https://cloudflare.com/cdn-cgi/trace?_t=${Date.now()}`, {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return true;
    } catch {
      return false;
    }
  }

  async function updateNetworkStatus() {
    if (typeof navigator === 'undefined') return;

    const navOffline = !navigator.onLine;
    if (navOffline) {
      applyOfflineState();
      return;
    }

    if (!isProbing) {
      isProbing = true;
      const reachable = await checkActiveInternet();
      isProbing = false;

      if (!reachable) {
        applyOfflineState();
        return;
      }
    }

    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection?.type === 'wifi') {
      networkType = 'wifi';
    } else {
      networkType = '5g_4g';
    }
    stateMachine.updateConnectivity(true);
    graceCountdown = 0;
    if (graceTimer) {
      clearInterval(graceTimer);
      graceTimer = null;
    }
  }

  function applyOfflineState() {
    stateMachine.updateConnectivity(false);
    if (stateMachine.getOperatingMode() === AppOperatingMode.DISASTER_MESH) {
      networkType = peerCounts.total > 0 ? 'disaster_mesh' : 'isolated';
      graceCountdown = 0;
      if (graceTimer) {
        clearInterval(graceTimer);
        graceTimer = null;
      }
    } else {
      if (!graceTimer) {
        graceCountdown = 5;
        graceTimer = setInterval(() => {
          graceCountdown--;
          stateMachine.checkGracePeriod();
          if (graceCountdown <= 0 || stateMachine.getOperatingMode() === AppOperatingMode.DISASTER_MESH) {
            clearInterval(graceTimer);
            graceTimer = null;
            networkType = peerCounts.total > 0 ? 'disaster_mesh' : 'isolated';
          }
        }, 1000);
      }
    }
  }

  async function initBattery() {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      try {
        const b: any = await (navigator as any).getBattery();
        batteryPct = Math.round(b.level * 100);
        isCharging = b.charging;
        batteryEstimate = BatteryRuntimeEstimator.estimateRuntime(batteryPct, isCharging);

        b.addEventListener('levelchange', () => {
          batteryPct = Math.round(b.level * 100);
          batteryEstimate = BatteryRuntimeEstimator.estimateRuntime(batteryPct, isCharging);
        });
        b.addEventListener('chargingchange', () => {
          isCharging = b.charging;
          batteryEstimate = BatteryRuntimeEstimator.estimateRuntime(batteryPct, isCharging);
        });
      } catch {}
    }
  }

  function toggleFlashlight() {
    isFlashlightActive = !isFlashlightActive;
    const dispatcher = NativeBridgeDispatcher.getInstance();
    if (isFlashlightActive) {
      dispatcher.startSosStrobe();
    } else {
      dispatcher.stopSosStrobe();
    }
  }

  function toggleSiren() {
    isSirenActive = !isSirenActive;
    const dispatcher = NativeBridgeDispatcher.getInstance();
    if (isSirenActive) {
      dispatcher.playAudibleAlarm();
    } else {
      dispatcher.stopAudibleAlarm();
    }
  }

  function toggleStealth() {
    isStealthActive = !isStealthActive;
    peerDiscoveryManager.setStealthMode(isStealthActive);
  }

  function handlePanicClick() {
    dispatch('panic');
  }

  function toggleSurvivalMode() {
    isUltraSurvival = !isUltraSurvival;
    dispatch('toggleSurvival');
  }

  onMount(() => {
    updateNetworkStatus();
    initBattery();

    unsubscribeState = stateMachine.onTransition((event) => {
      currentMode = event.currentMode;
      if (currentMode === AppOperatingMode.DISASTER_MESH) {
        networkType = peerCounts.total > 0 ? 'disaster_mesh' : 'isolated';
      } else {
        networkType = '5g_4g';
      }
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('online', updateNetworkStatus);
      window.addEventListener('offline', updateNetworkStatus);
      probeTimer = setInterval(updateNetworkStatus, 5000);
    }
  });

  onDestroy(() => {
    if (unsubscribeState) unsubscribeState();
    if (graceTimer) clearInterval(graceTimer);
    if (probeTimer) clearInterval(probeTimer);
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
    }
  });
</script>

<div class="network-status-bar" class:mesh={networkType === 'disaster_mesh'} class:isolated={networkType === 'isolated'}>
  <div class="status-left">
    {#if isStealthActive}
      <span class="badge-stealth" title="โหมดพรางตัว 0 mW">
        🔕 STEALTH (0 mW)
      </span>
    {/if}

    {#if networkType === 'wifi'}
      <span class="badge-mesh badge-wifi-look" title="เชื่อมต่อผ่าน Wi-Fi">
        <span class="pulse-indicator-small"></span> 📶 WI-FI
      </span>
    {:else if networkType === '5g_4g'}
      <span class="badge-mesh badge-cellular-look" title="เชื่อมต่อผ่าน 5G / 4G">
        <span class="pulse-indicator-small"></span> 🌐 5G/4G
      </span>
    {:else if networkType === 'disaster_mesh'}
      <span class="badge-mesh" title="โหมดวิทยุกู้ภัยออฟไลน์ (BLE Coded PHY / LoRa)">
        <span class="pulse-indicator-small"></span> 📡 MESH
      </span>
    {:else}
      <span class="badge-isolated" title="ไม่มีสัญญาณเน็ตและยังไม่พบโหนดรอบตัว">
        ⚠️ ISOLATED {graceCountdown > 0 ? `(${graceCountdown}s)` : ''}
      </span>
    {/if}
  </div>

  <!-- Inline Emergency Beacon Controls -->
  <div class="beacon-controls-inline">
    <span class="header-title-inline">⚡ ฉุกเฉิน:</span>
    <button
      class="btn-beacon"
      class:active={isFlashlightActive}
      on:click={toggleFlashlight}
      title="ไฟฉายกระพริบรหัสมอร์ส SOS"
    >
      <span>⚡</span> <span>ไฟฉาย SOS</span>
    </button>
    <button
      class="btn-beacon"
      class:active={isSirenActive}
      on:click={toggleSiren}
      title="หวูดเตือนภัยความดัง 85dB"
    >
      <span>📢</span> <span>หวูด 85dB</span>
    </button>
    <button
      class="btn-beacon"
      class:btn-stealth-active={isStealthActive}
      on:click={toggleStealth}
      title="โหมดพรางตัว Stealth (หยุดส่งคลื่นวิทยุ 0 mW)"
    >
      <span>🔕</span> <span>{isStealthActive ? 'Stealth: ON' : 'Stealth: OFF'}</span>
    </button>
    <button
      class="btn-panic"
      on:click={handlePanicClick}
      title="ส่งสัญญาณฉุกเฉินระดับวิกฤต PANIC กระจาย 15 Hops"
    >
      🚨 PANIC
    </button>
  </div>

  <!-- Compact Status Badges -->
  <div class="status-right">
    <button
      class="node-pill"
      on:click={() => showPeerModal = true}
      title="โหนดรอบตัวในรัศมี ≤500m (แตะเพื่อดูสรุป)"
    >
      <span>👥</span>
      <span>{peerCounts.total} Node</span>
    </button>

    <div
      class="battery-icon-container"
      on:click={() => showBatteryModal = true}
      title="แบตเตอรี่ {batteryPct}% (~{batteryEstimate.estimatedHours}h) แตะเพื่อดูรายละเอียด"
      role="button"
      tabindex="0"
      on:keydown={(e) => e.key === 'Enter' && (showBatteryModal = true)}
    >
      <div class="battery-shell">
        <div class="battery-fill" style="width: {batteryPct}%;"></div>
        <span class="battery-text-inside">{batteryPct}%</span>
      </div>
    </div>
  </div>
</div>

<!-- Modal 1: สรุปโหนดรอบตัว (Peer Breakdown) -->
{#if showPeerModal}
  <div
    class="modal-overlay"
    role="dialog"
    aria-modal="true"
    aria-label="สรุปโหนดรอบตัว"
    tabindex="-1"
    on:click={() => showPeerModal = false}
    on:keydown={(e) => e.key === 'Escape' && (showPeerModal = false)}
  >
    <div
      class="modal-card"
      role="document"
      tabindex="0"
      on:click|stopPropagation
      on:keydown|stopPropagation
    >
      <div class="modal-header">
        <span style="font-weight: 800; color: #38bdf8;">👥 สรุปโหนดรอบตัวในรัศมีวิทยุ ({peerCounts.total} โหนด)</span>
        <button class="btn-close-modal" on:click={() => showPeerModal = false}>✕</button>
      </div>

      <div class="modal-body-list">
        <div class="modal-row row-sos">
          <span>🚨 โหนดผู้ประสบภัย (SOS Active):</span>
          <b class="val-sos">{peerCounts.sos}</b>
        </div>
        <div class="modal-row">
          <span>🤝 โหนดเพื่อนที่จับคู่แล้ว:</span>
          <b>{peerCounts.friends}</b>
        </div>
        <div class="modal-row">
          <span>🔁 โหนดทวนสัญญาณ (Mesh Relays):</span>
          <b>{peerCounts.relays}</b>
        </div>
        <div class="modal-row">
          <span>🌐 เกตเวย์ต่อเน็ตได้ (Internet Gateways):</span>
          <b style="color: #34d399;">{peerCounts.gateways}</b>
        </div>
      </div>

      <p class="modal-hint">
        ⚡ ระบบใช้คลื่นวิทยุ BLE Coded PHY (S=8) ทะลุสิ่งกีดขวาง 300ม. - 5กม. และส่งต่อแบบอัตโนมัติ
      </p>

      <button class="btn-modal-action" on:click={() => showPeerModal = false}>
        ตกลง
      </button>
    </div>
  </div>
{/if}

<!-- Modal 2: รายละเอียดพลังงานและแบตเตอรี่ (Battery Detail Modal) -->
{#if showBatteryModal}
  <div
    class="modal-overlay"
    role="dialog"
    aria-modal="true"
    aria-label="รายละเอียดแบตเตอรี่"
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
        <span style="font-weight: 800; color: #22c55e;">🔋 สถานะแบตเตอรี่ & การจัดการพลังงานกู้ชีพ</span>
        <button class="btn-close-modal" on:click={() => showBatteryModal = false}>✕</button>
      </div>

      <div class="modal-body-list">
        <div class="modal-row">
          <span>🔋 แบตเตอรี่คงเหลือ:</span>
          <b style="color: #22c55e;">{batteryPct}% ({isCharging ? '⚡ กำลังชาร์จ' : `~${batteryEstimate.estimatedHours} ชม.`})</b>
        </div>
        <div class="modal-row">
          <span>📻 การกินไฟคลื่นวิทยุ:</span>
          <b style="color: #38bdf8;">~0.4W (BLE 5.0 Coded PHY)</b>
        </div>
        <div class="modal-row">
          <span>🖤 จอภาพ AMOLED ประหยัดไฟ:</span>
          <b style="color: #34d399;">เปิดใช้งาน (AMOLED Black)</b>
        </div>
        <div class="modal-row">
          <span>🛑 โหมด Last-Gasp Beacon:</span>
          <b style="color: #f59e0b;">พร้อมทำงานอัตโนมัติที่ 5%</b>
        </div>
        <div class="modal-row">
          <span>⚡ โหมด 1-Tap Ultra Survival:</span>
          <b>
            <button
              class="btn-toggle-survival"
              class:active={isUltraSurvival}
              on:click={toggleSurvivalMode}
            >
              {isUltraSurvival ? '🛑 ปิดโหมด Survival' : '⚡ เปิดโหมด Survival'}
            </button>
          </b>
        </div>
      </div>

      <p class="modal-hint">
        💡 เมื่อเปิดโหมด 1-Tap Survival ระบบจะขยายรอบส่งวิทยุให้ประหยัดแบตสูงสุด ยืดอายุการใช้งานได้นานกว่า 72 ชม.
      </p>

      <button class="btn-modal-action" on:click={() => showBatteryModal = false}>
        ปิดหน้าต่าง
      </button>
    </div>
  </div>
{/if}

<style>
  .network-status-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.25rem 0.5rem;
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 0.5rem;
    margin-bottom: 0.5rem;
    gap: 0.35rem;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .network-status-bar::-webkit-scrollbar {
    display: none;
  }
  .status-left {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    flex-shrink: 0;
  }
  .badge-mesh {
    background: #064e3b;
    color: #34d399;
    border: 1px solid #059669;
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 800;
    font-size: 0.65rem;
    display: flex;
    align-items: center;
    gap: 3px;
    white-space: nowrap;
  }
  .badge-wifi-look {
    background: #064e3b;
    color: #4ade80;
    border-color: #10b981;
  }
  .badge-cellular-look {
    background: #0c4a6e;
    color: #38bdf8;
    border-color: #0284c7;
  }
  .badge-stealth {
    background: #78350f;
    color: #fcd34d;
    border: 1px solid #d97706;
    padding: 2px 5px;
    border-radius: 4px;
    font-weight: 800;
    font-size: 0.62rem;
    white-space: nowrap;
  }
  .badge-isolated {
    background: #7f1d1d;
    color: #fca5a5;
    border: 1px solid #ef4444;
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 800;
    font-size: 0.65rem;
    white-space: nowrap;
  }
  .pulse-indicator-small {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #22c55e;
    box-shadow: 0 0 6px #22c55e;
  }
  .beacon-controls-inline {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    flex-shrink: 0;
  }
  .header-title-inline {
    font-size: 0.65rem;
    font-weight: 700;
    color: #38bdf8;
    white-space: nowrap;
  }
  .btn-beacon {
    background: #1e293b;
    color: #cbd5e1;
    border: 1px solid #334155;
    padding: 0.15rem 0.4rem;
    border-radius: 0.3rem;
    font-size: 0.64rem;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    white-space: nowrap;
    transition: all 0.15s ease;
  }
  .btn-beacon:hover {
    background: #334155;
    color: #ffffff;
  }
  .btn-beacon.active {
    background: #f59e0b;
    color: #0f172a;
    border-color: #fbbf24;
    box-shadow: 0 0 6px rgba(245, 158, 11, 0.4);
  }
  .btn-stealth-active {
    background: #d97706 !important;
    color: #ffffff !important;
    border-color: #f59e0b !important;
    box-shadow: 0 0 6px rgba(217, 119, 6, 0.5);
  }
  .btn-panic {
    background: #dc2626;
    color: #ffffff;
    border: none;
    padding: 0.15rem 0.45rem;
    border-radius: 0.3rem;
    font-size: 0.64rem;
    font-weight: 800;
    cursor: pointer;
    box-shadow: 0 0 5px rgba(220, 38, 38, 0.4);
    white-space: nowrap;
    transition: transform 0.1s ease;
  }
  .btn-panic:active {
    transform: scale(0.95);
  }
  .status-right {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    flex-shrink: 0;
  }
  .node-pill {
    background: #1e293b;
    color: #cbd5e1;
    border: 1px solid #334155;
    padding: 2px 5px;
    border-radius: 4px;
    font-size: 0.65rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 3px;
    cursor: pointer;
    white-space: nowrap;
  }
  .node-pill:hover {
    border-color: #38bdf8;
  }
  .battery-icon-container {
    display: inline-flex;
    align-items: center;
    cursor: pointer;
    padding: 1px 3px;
    border-radius: 4px;
    background: #1e293b;
    border: 1px solid #334155;
    transition: background 0.15s, border-color 0.15s;
  }
  .battery-icon-container:hover {
    border-color: #38bdf8;
    background: #334155;
  }
  .battery-shell {
    width: 32px;
    height: 14px;
    border: 1.5px solid #22c55e;
    border-radius: 3px;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #022c22;
    overflow: hidden;
    margin-right: 2px;
  }
  .battery-shell::after {
    content: '';
    position: absolute;
    right: -3px;
    top: 3px;
    bottom: 3px;
    width: 2px;
    background: #22c55e;
    border-radius: 0 1px 1px 0;
  }
  .battery-fill {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    background: linear-gradient(90deg, #15803d, #22c55e);
    z-index: 1;
    opacity: 0.7;
    transition: width 0.3s ease;
  }
  .battery-text-inside {
    position: relative;
    z-index: 2;
    font-size: 8px;
    font-weight: 900;
    color: #ffffff;
    line-height: 1;
    letter-spacing: -0.5px;
    text-shadow: 0 1px 2px rgba(0,0,0,0.9);
  }

  /* Modals */
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
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.6);
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
  .modal-body-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 12px;
    margin-bottom: 12px;
  }
  .modal-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #1e293b;
    padding: 8px 10px;
    border-radius: 6px;
  }
  .val-sos {
    color: #ef4444;
    font-size: 14px;
  }
  .modal-hint {
    font-size: 11px;
    color: #94a3b8;
    margin: 0 0 14px 0;
    line-height: 1.4;
  }
  .btn-modal-action {
    width: 100%;
    background: #0284c7;
    color: #ffffff;
    border: none;
    padding: 8px;
    border-radius: 6px;
    font-weight: 700;
    font-size: 12px;
    cursor: pointer;
  }
  .btn-toggle-survival {
    background: #1e293b;
    color: #38bdf8;
    border: 1px solid #0284c7;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
  }
  .btn-toggle-survival.active {
    background: #0284c7;
    color: #fff;
  }
</style>