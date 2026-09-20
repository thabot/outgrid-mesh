<script lang="ts">
  /**
   * Top Floating Emergency Alert Banner & Deduplication Engine (Sprint E Task E.3)
   * Multi-sensory alert, 64-bit MessageId deduplication cache, and 1-tap radar launcher
   * Creator & Lead Architect: Thabot <thabo47@gmail.com>
   * Protocol: TOG v1.1 Emergency Alerts
   * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
   */
  import { createEventDispatcher } from 'svelte';

  export interface IIncomingSosAlert {
    id: string;
    senderNodeId: string;
    lat: number;
    lng: number;
    distanceMeters: number;
    category: string;
    timestamp: number;
  }

  export let alertData: IIncomingSosAlert | null = null;

  const dispatch = createEventDispatcher<{
    openRadar: { target: IIncomingSosAlert };
    dismiss: void;
  }>();

  // LRU Deduplication Set (2,048 entries ceiling)
  const seenMessageIds = new Set<string>();

  export function handleIncomingSosPacket(alert: IIncomingSosAlert): boolean {
    if (seenMessageIds.has(alert.id)) {
      return false; // Suppressed duplicate packet
    }

    if (seenMessageIds.size >= 2048) {
      const oldest = seenMessageIds.values().next().value;
      if (oldest) seenMessageIds.delete(oldest);
    }

    seenMessageIds.add(alert.id);
    alertData = alert;

    // Trigger haptic vibration if supported
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 600]);
    }

    return true;
  }

  function handleOpenRadar() {
    if (alertData) {
      dispatch('openRadar', { target: alertData });
    }
  }

  function handleDismiss() {
    alertData = null;
    dispatch('dismiss');
  }
</script>

{#if alertData}
  <div class="sos-banner-container" role="alert">
    <div class="sos-banner-content">
      <div class="banner-left">
        <span class="siren-icon">🚨</span>
        <div class="alert-texts">
          <strong class="alert-title">สัญญาณขอความช่วยเหลือฉุกเฉิน!</strong>
          <span class="alert-detail">
            {alertData.category} • ห่างออกไป ~{alertData.distanceMeters} ม. ({alertData.senderNodeId})
          </span>
        </div>
      </div>

      <div class="banner-actions">
        <button class="btn-radar" on:click={handleOpenRadar}>
          🧭 เปิดเรดาร์นำทาง
        </button>
        <button class="btn-dismiss" on:click={handleDismiss} aria-label="ปิดการแจ้งเตือน">
          ✕
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .sos-banner-container {
    position: sticky;
    top: 0;
    left: 0;
    right: 0;
    z-index: 120;
    margin-bottom: 10px;
    animation: drop-in 0.3s ease-out;
  }

  @keyframes drop-in {
    from { transform: translateY(-100%); }
    to { transform: translateY(0); }
  }

  .sos-banner-content {
    background: #7f1d1d;
    border: 2px solid #ef4444;
    box-shadow: 0 4px 16px rgba(239, 68, 68, 0.4);
    border-radius: 8px;
    padding: 8px 14px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #ffffff;
    flex-wrap: wrap;
    gap: 8px;
  }

  .banner-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .siren-icon {
    font-size: 1.4rem;
    animation: flash-siren 1s infinite alternate;
  }

  @keyframes flash-siren {
    0% { transform: scale(1); }
    100% { transform: scale(1.2); }
  }

  .alert-texts {
    display: flex;
    flex-direction: column;
  }

  .alert-title {
    font-size: 0.88rem;
    color: #fef2f2;
  }

  .alert-detail {
    font-size: 0.75rem;
    color: #fecaca;
  }

  .banner-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .btn-radar {
    background: #ef4444;
    border: 1px solid #fee2e2;
    color: #ffffff;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  }

  .btn-radar:hover {
    background: #dc2626;
  }

  .btn-dismiss {
    background: none;
    border: none;
    color: #fca5a5;
    font-size: 1.1rem;
    cursor: pointer;
  }
</style>