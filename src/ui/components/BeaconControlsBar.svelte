<script lang="ts">
  /**
   * Emergency Hardware & Power HUD Bar (BeaconControlsBar)
   * Controls Flashlight SOS Strobe, Acoustic Morse Siren, and Panic Beacon
   * Creator & Lead Architect: Thabot <thabo47@gmail.com>
   * Protocol: TOG v1.1 Emergency Hardware
   * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
   */
  import { EmergencyBeaconControls } from '../../core/emergency/EmergencyBeaconControls';
  import { NativeBridgeDispatcher } from '../../core/native/NativeBridgeDispatcher';
  import { onDestroy } from 'svelte';

  const controls = new EmergencyBeaconControls();
  const dispatcher = NativeBridgeDispatcher.getInstance();

  export let isTorchActive = false;
  export let isSirenActive = false;
  export let isMuted = false;
  export let thermalWarning = false;

  let thermalCheckInterval: any = null;

  function toggleTorch() {
    if (isTorchActive) {
      controls.stopFlashlight();
      dispatcher.stopTorch();
      isTorchActive = false;
    } else {
      controls.startFlashlightMorse();
      dispatcher.toggleTorch(true);
      isTorchActive = true;
      startThermalMonitoring();
    }
  }

  function toggleSosStrobe() {
    if (isTorchActive) {
      controls.stopFlashlight();
      dispatcher.stopTorch();
      isTorchActive = false;
    } else {
      controls.startFlashlightMorse();
      dispatcher.startSosStrobe();
      isTorchActive = true;
      startThermalMonitoring();
    }
  }

  function toggleSiren() {
    if (isSirenActive) {
      controls.stopAcousticSiren();
      isSirenActive = false;
    } else {
      controls.startAcousticSiren();
      isSirenActive = true;
    }
  }

  function toggleMute() {
    isMuted = controls.toggleMute();
  }

  function triggerMasterPanic() {
    controls.startPanicBeacon();
    dispatcher.startSosStrobe();
    dispatcher.vibrateSosPattern();
    isTorchActive = true;
    isSirenActive = true;
    isMuted = false;
    startThermalMonitoring();
  }

  function stopAll() {
    controls.stopAllBeacons();
    dispatcher.stopTorch();
    isTorchActive = false;
    isSirenActive = false;
    thermalWarning = false;
    if (thermalCheckInterval) clearInterval(thermalCheckInterval);
  }

  function startThermalMonitoring() {
    if (thermalCheckInterval) clearInterval(thermalCheckInterval);
    thermalCheckInterval = setInterval(() => {
      const cut = controls.checkThermalCutoff();
      if (cut) {
        dispatcher.stopTorch();
        isTorchActive = false;
        thermalWarning = true;
        clearInterval(thermalCheckInterval);
      }
    }, 2000);
  }

  onDestroy(() => {
    if (thermalCheckInterval) clearInterval(thermalCheckInterval);
  });
</script>

<div class="beacon-controls-root">
  <div class="controls-row">
    <span class="header-title">⚡ ฉุกเฉิน:</span>

    <div class="btn-single-row">
      <button
        class="btn-beacon"
        class:active={isTorchActive}
        on:click={toggleSosStrobe}
        title="กะพริบไฟแฟลชหลังมือถือรหัสมอส SOS (... --- ...)"
      >
        <span class="icon">⚡</span>
        <span class="text">{isTorchActive ? 'ปิดไฟฉาย' : 'ไฟฉาย SOS'}</span>
      </button>

      <button
        class="btn-beacon"
        class:active={isSirenActive}
        on:click={toggleSiren}
        title="ส่งสัญญาณหวูดไซเรนความถี่สูง 960Hz / 1440Hz ทะลุสิ่งกีดขวาง"
      >
        <span class="icon">📢</span>
        <span class="text">{isSirenActive ? (isMuted ? 'หวูดปิดเสียง' : 'ปิดไซเรน') : 'หวูด 85dB'}</span>
      </button>

      {#if isSirenActive}
        <button class="btn-mute" on:click={toggleMute} title="ปิด/เปิดเสียงหวูดชั่วคราว">
          {isMuted ? '🔊' : '🔇'}
        </button>
      {/if}

      <button
        class="btn-panic"
        on:click={triggerMasterPanic}
        title="เปิดไฟฉาย SOS + หวูดไซเรน + สั่นรหัสมอสพร้อมกันทันที"
      >
        🚨 PANIC
      </button>

      {#if isTorchActive || isSirenActive}
        <button class="btn-stop" on:click={stopAll} title="ปิดสัญญาณทั้งหมด">
          ⏹️
        </button>
      {/if}
    </div>

    {#if thermalWarning}
      <span class="badge-thermal" title="ตัดไฟฉายอัตโนมัติครบ 5 นาทีเพื่อป้องกันความร้อน">⚠️ ร้อน</span>
    {/if}
  </div>
</div>

<style>
  .beacon-controls-root {
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 0.5rem;
    padding: 0.25rem 0.6rem;
    margin-bottom: 0.5rem;
  }
  .controls-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-wrap: nowrap;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .controls-row::-webkit-scrollbar {
    display: none;
  }
  .header-title {
    font-size: 0.72rem;
    font-weight: 700;
    color: #38bdf8;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .btn-single-row {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    flex-wrap: nowrap;
    flex-shrink: 0;
  }
  .badge-thermal {
    font-size: 0.62rem;
    background: #7f1d1d;
    color: #fca5a5;
    padding: 1px 5px;
    border-radius: 9999px;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .btn-beacon {
    background: #1e293b;
    color: #cbd5e1;
    border: 1px solid #334155;
    padding: 0.18rem 0.45rem;
    border-radius: 0.3rem;
    font-size: 0.68rem;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    transition: all 0.15s ease;
    white-space: nowrap;
  }
  .btn-beacon.active {
    background: #f59e0b;
    color: #0f172a;
    border-color: #fbbf24;
    box-shadow: 0 0 8px rgba(245, 158, 11, 0.4);
  }
  .btn-mute {
    background: #334155;
    color: #f1f5f9;
    border: none;
    padding: 0.18rem 0.35rem;
    border-radius: 0.3rem;
    font-size: 0.68rem;
    cursor: pointer;
    white-space: nowrap;
  }
  .btn-panic {
    background: #dc2626;
    color: #ffffff;
    border: none;
    padding: 0.18rem 0.5rem;
    border-radius: 0.3rem;
    font-size: 0.68rem;
    font-weight: 800;
    cursor: pointer;
    box-shadow: 0 0 6px rgba(220, 38, 38, 0.4);
    animation: pulse-panic 1.5s infinite;
    white-space: nowrap;
  }
  .btn-stop {
    background: #475569;
    color: #f8fafc;
    border: none;
    padding: 0.18rem 0.35rem;
    border-radius: 0.3rem;
    font-size: 0.68rem;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
  }
  @keyframes pulse-panic {
    0% { transform: scale(1); }
    50% { transform: scale(1.03); }
    100% { transform: scale(1); }
  }
</style>
