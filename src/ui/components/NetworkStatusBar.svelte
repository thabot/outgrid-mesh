<script lang="ts">
  /**
   * Network Status Bar & Peer Node Breakdown Component (Sprint D Task D.1)
   * Creator & Lead Architect: Thabot <thabo47@gmail.com>
   * Protocol: TOG v1.1 Autonomous Mode Transition
   * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
   */
  import { onMount, onDestroy } from 'svelte';
  import { ModeStateMachine, AppOperatingMode } from '../../core/state/ModeStateMachine';
  import { BatteryRuntimeEstimator, type IBatteryRuntimeEstimate } from '../../core/battery/BatteryRuntimeEstimator';

  export let stateMachine: ModeStateMachine = new ModeStateMachine(AppOperatingMode.NORMAL_CLOUD);
  export let peerCounts = {
    sos: 0,
    friends: 0,
    relays: 0,
    gateways: 0,
    total: 0
  };

  let currentMode: AppOperatingMode = stateMachine.getOperatingMode();
  let networkType: '5g_4g' | 'wifi' | 'disaster_mesh' | 'isolated' = '5g_4g';
  let batteryPct = 85;
  let isCharging = false;
  let batteryEstimate: IBatteryRuntimeEstimate = BatteryRuntimeEstimator.estimateRuntime(batteryPct, isCharging);
  let showPeerModal = false;
  let graceCountdown = 0;
  let graceTimer: any = null;
  let unsubscribeState: (() => void) | null = null;

  function updateNetworkStatus() {
    if (typeof navigator !== 'undefined') {
      const isOnline = navigator.onLine;
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      
      if (isOnline) {
        if (connection?.type === 'wifi' || connection?.effectiveType === '4g') {
          networkType = connection.type === 'wifi' ? 'wifi' : '5g_4g';
        } else {
          networkType = '5g_4g';
        }
        stateMachine.updateConnectivity(true);
        graceCountdown = 0;
        if (graceTimer) clearInterval(graceTimer);
      } else {
        // Disconnected - check state machine
        stateMachine.updateConnectivity(false);
        if (stateMachine.getOperatingMode() === AppOperatingMode.DISASTER_MESH) {
          networkType = peerCounts.total > 0 ? 'disaster_mesh' : 'isolated';
          graceCountdown = 0;
        } else {
          // In 5s grace period
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
      } catch {
        // Battery API fallback
      }
    }
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
    }
  });

  onDestroy(() => {
    if (unsubscribeState) unsubscribeState();
    if (graceTimer) clearInterval(graceTimer);
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
    }
  });
</script>

<div class="network-status-bar" class:mesh={networkType === 'disaster_mesh'} class:isolated={networkType === 'isolated'}>
  <div class="status-left">
    {#if networkType === 'wifi'}
      <span class="badge badge-wifi" title="เชื่อมต่อผ่านเครือข่าย Wi-Fi">
        <span class="dot"></span> Wi-Fi
      </span>
    {:else if networkType === '5g_4g'}
      <span class="badge badge-cellular" title="เชื่อมต่อผ่าน Cellular Cloud">
        <span class="dot"></span> 5G / 4G
      </span>
    {:else if networkType === 'disaster_mesh'}
      <span class="badge badge-mesh" title="โหมดวิทยุกู้ภัยออฟไลน์ (BLE / LoRa)">
        <span class="pulse-ring"></span> 📡 DISASTER MESH
      </span>
    {:else}
      <span class="badge badge-isolated" title="ไม่มีสัญญาณเน็ตและยังไม่พบโหนดรอบตัว">
        ⚠️ ISOLATED {graceCountdown > 0 ? `(${graceCountdown}s)` : ''}
      </span>
    {/if}

    {#if graceCountdown > 0}
      <span class="grace-tag">สลับโหมดใน {graceCountdown}s</span>
    {/if}
  </div>

  <div class="status-right">
    <button class="node-pill" on:click={() => showPeerModal = !showPeerModal} title="แตะเพื่อดูรายละเอียดโหนดรอบข้าง">
      <span class="node-icon">👥</span>
      <span class="node-count">{peerCounts.total} โหนด</span>
    </button>

    <div class="battery-pill" title="ระดับแบตเตอรี่และเวลาคงเหลือ">
      <span class="bat-icon">{isCharging ? '⚡' : '🔋'}</span>
      <span class="bat-text">{batteryPct}% (~{batteryEstimate.estimatedHours}h)</span>
    </div>
  </div>
</div>

<!-- Modal รายละเอียดโหนดรอบตัว (Peer Breakdown) -->
{#if showPeerModal}
  <div
    class="peer-modal-overlay"
    role="dialog"
    aria-modal="true"
    aria-label="สรุปโครงข่ายโหนดรอบตัว"
    tabindex="-1"
    on:click={() => showPeerModal = false}
    on:keydown={(e) => e.key === 'Escape' && (showPeerModal = false)}
  >
    <div
      class="peer-modal"
      role="document"
      tabindex="0"
      on:click|stopPropagation
      on:keydown|stopPropagation
    >
      <div class="modal-header">
        <h3>👥 สรุปโครงข่ายโหนดรอบตัว ({peerCounts.total})</h3>
        <button class="close-btn" on:click={() => showPeerModal = false} aria-label="ปิดหน้าต่าง">✕</button>
      </div>

      <div class="modal-content">
        <div class="node-row row-sos">
          <span class="row-icon">🚨</span>
          <span class="row-label">โหนดขอความช่วยเหลือ (SOS Beacons):</span>
          <span class="row-val count-sos">{peerCounts.sos}</span>
        </div>
        <div class="node-row row-friends">
          <span class="row-icon">🤝</span>
          <span class="row-label">เพื่อนและผู้ติดต่อที่ยืนยันแล้ว:</span>
          <span class="row-val">{peerCounts.friends}</span>
        </div>
        <div class="node-row row-relays">
          <span class="row-icon">🔁</span>
          <span class="row-label">สถานีรีเลย์ชุมชน (Mesh Relays):</span>
          <span class="row-val">{peerCounts.relays}</span>
        </div>
        <div class="node-row row-gateways">
          <span class="row-icon">🌐</span>
          <span class="row-label">เกตเวย์เชื่อมต่อ LoRa / ดาวเทียม:</span>
          <span class="row-val">{peerCounts.gateways}</span>
        </div>
      </div>

      <div class="modal-footer">
        <p class="footer-hint">ระบบค้นหาและกระจายแพ็กเก็ตผ่าน BLE Coded S=8 ในระยะวิทยุ 300ม. – 5กม.</p>
        <button class="btn-done" on:click={() => showPeerModal = false}>ตกลง</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .network-status-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #090f1d;
    border: 1px solid #1e293b;
    border-radius: 8px;
    padding: 6px 12px;
    margin-bottom: 10px;
    font-size: 0.8rem;
    color: #e2e8f0;
    transition: all 0.3s ease;
  }

  .network-status-bar.mesh {
    border-color: #f97316;
    background: #180d04;
    box-shadow: 0 0 12px rgba(249, 115, 22, 0.2);
  }

  .network-status-bar.isolated {
    border-color: #ef4444;
    background: #1a0808;
  }

  .status-left, .status-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 8px;
    border-radius: 4px;
    font-weight: 700;
    font-size: 0.75rem;
    letter-spacing: 0.5px;
  }

  .badge-wifi, .badge-cellular {
    background: rgba(34, 197, 94, 0.15);
    color: #4ade80;
    border: 1px solid rgba(34, 197, 94, 0.3);
  }

  .badge-mesh {
    background: rgba(249, 115, 22, 0.2);
    color: #fb923c;
    border: 1px solid #f97316;
    animation: mesh-glow 2s infinite alternate;
  }

  .badge-isolated {
    background: rgba(239, 68, 68, 0.2);
    color: #f87171;
    border: 1px solid #ef4444;
  }

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #4ade80;
    box-shadow: 0 0 6px #4ade80;
  }

  .pulse-ring {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #f97316;
    box-shadow: 0 0 6px #f97316;
  }

  .grace-tag {
    font-size: 0.7rem;
    color: #fbbf24;
    background: rgba(245, 158, 11, 0.15);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .node-pill, .battery-pill {
    display: flex;
    align-items: center;
    gap: 4px;
    background: #1e293b;
    border: 1px solid #334155;
    color: #cbd5e1;
    padding: 3px 8px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.75rem;
    transition: all 0.2s;
  }

  .node-pill:hover {
    background: #334155;
    color: #38bdf8;
    border-color: #38bdf8;
  }

  .node-count {
    font-weight: 600;
  }

  /* Peer Breakdown Modal */
  .peer-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.75);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    backdrop-filter: blur(4px);
  }

  .peer-modal {
    background: #0f172a;
    border: 1px solid #334155;
    border-radius: 12px;
    width: 90%;
    max-width: 420px;
    padding: 16px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.6);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #1e293b;
    padding-bottom: 10px;
    margin-bottom: 12px;
  }

  .modal-header h3 {
    margin: 0;
    font-size: 1rem;
    color: #38bdf8;
  }

  .close-btn {
    background: none;
    border: none;
    color: #94a3b8;
    font-size: 1.2rem;
    cursor: pointer;
  }

  .modal-content {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .node-row {
    display: flex;
    align-items: center;
    padding: 8px 10px;
    background: #1e293b;
    border-radius: 6px;
    font-size: 0.85rem;
  }

  .row-icon {
    font-size: 1.1rem;
    margin-right: 8px;
  }

  .row-label {
    flex: 1;
    color: #cbd5e1;
  }

  .row-val {
    font-weight: 700;
    color: #38bdf8;
  }

  .count-sos {
    color: #ef4444;
    font-size: 1rem;
  }

  .modal-footer {
    margin-top: 14px;
    border-top: 1px solid #1e293b;
    padding-top: 10px;
  }

  .footer-hint {
    font-size: 0.72rem;
    color: #64748b;
    margin: 0 0 10px 0;
  }

  .btn-done {
    width: 100%;
    background: #0284c7;
    color: #ffffff;
    border: none;
    border-radius: 6px;
    padding: 8px;
    font-weight: 600;
    cursor: pointer;
  }

  @keyframes mesh-glow {
    0% { box-shadow: 0 0 5px rgba(249, 115, 22, 0.2); }
    100% { box-shadow: 0 0 12px rgba(249, 115, 22, 0.6); }
  }
</style>