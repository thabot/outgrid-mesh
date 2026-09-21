<script lang="ts">
  /**
   * Tactical Rescue Radar HUD Component (Sprint E Task E.1)
   * 360° Compass bearing, Low-Pass Filter, distance countdown, and audio Geiger-counter beeping
   * Creator & Lead Architect: Thabot <thabo47@gmail.com>
   * Protocol: TOG v1.1 Tactical Spatial Radar
   * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
   */
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { SosRadarEngine } from '../../core/spatial/SosRadarEngine';

  export let target = {
    id: 'sos-target-01',
    lat: 13.7590,
    lng: 100.5050,
    category: '🚤 น้ำท่วม ต้องการเรือ',
    floor: 1
  };

  export let myLocation = {
    lat: 13.7563,
    lng: 100.5018
  };

  const dispatch = createEventDispatcher<{ close: void }>();

  let deviceHeading = 0;
  let filteredHeading = 0;
  let targetBearing = 0;
  let relativeBearing = 0;
  let distanceMeters = 0;
  let isCalibrating = false;
  let isSoundEnabled = true;

  // Web Audio Context for Geiger-Counter proximity pinging
  let audioCtx: AudioContext | null = null;
  let pingTimer: any = null;

  function updateBearingAndDistance() {
    distanceMeters = SosRadarEngine.calculateDistanceMeters(
      myLocation.lat,
      myLocation.lng,
      target.lat,
      target.lng
    );

    targetBearing = SosRadarEngine.calculateBearingDegrees(
      myLocation.lat,
      myLocation.lng,
      target.lat,
      target.lng
    );

    relativeBearing = SosRadarEngine.calculateRelativeBearing(filteredHeading, targetBearing);
  }

  function handleDeviceOrientation(e: DeviceOrientationEvent) {
    if (e.alpha !== null) {
      // In mobile browsers: alpha represents rotation around z-axis (compass heading)
      const rawHeading = (360 - (e.alpha || 0)) % 360;
      filteredHeading = SosRadarEngine.applyLowPassFilter(rawHeading, filteredHeading, 0.15);
      deviceHeading = Math.round(filteredHeading);
      updateBearingAndDistance();
    }
  }

  function playGeigerBeep() {
    if (!isSoundEnabled) return;
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      // Pitch increases as you get closer: 800Hz to 1600Hz
      const freq = Math.min(1600, Math.max(800, 1600 - distanceMeters));
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);
    } catch {
      // Audio fallback
    }
  }

  function scheduleProximityBeep() {
    if (pingTimer) clearTimeout(pingTimer);
    playGeigerBeep();

    // Interval shrinks as distance decreases:
    // > 200m -> 1500ms
    // 50-200m -> 600ms
    // < 50m -> 200ms
    let intervalMs = 1500;
    if (distanceMeters < 30) {
      intervalMs = 150;
    } else if (distanceMeters < 100) {
      intervalMs = 400;
    } else if (distanceMeters < 300) {
      intervalMs = 800;
    }

    pingTimer = setTimeout(scheduleProximityBeep, intervalMs);
  }

  onMount(() => {
    updateBearingAndDistance();
    if (typeof window !== 'undefined') {
      window.addEventListener('deviceorientation', handleDeviceOrientation, true);
    }
    scheduleProximityBeep();
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('deviceorientation', handleDeviceOrientation, true);
    }
    if (pingTimer) clearTimeout(pingTimer);
    if (audioCtx) {
      try { audioCtx.close(); } catch {}
    }
  });
</script>

<div class="radar-modal-overlay" role="dialog" aria-modal="true" aria-label="Tactical Rescue Radar">
  <div class="radar-pane">
    <div class="radar-top-bar">
      <div class="target-badge">
        <span class="pulse-dot"></span>
        <span>🚨 เป้าหมายกู้ภัย: {target.category}</span>
      </div>
      <button class="btn-close" on:click={() => dispatch('close')} aria-label="ปิดเรดาร์">✕</button>
    </div>

    <!-- Distance Countdown Bar -->
    <div class="distance-hud">
      <span class="dist-label">ระยะห่างทางราบ:</span>
      <strong class="dist-value">{distanceMeters} ม.</strong>
      <span class="floor-tag">🏢 ประเมินอยู่ที่ชั้น {target.floor || 1}</span>
    </div>

    <!-- Tactical Circular Radar Screen -->
    <div class="radar-screen">
      <div class="radar-sweep-line"></div>
      <div class="radar-ring ring-outer"></div>
      <div class="radar-ring ring-mid"></div>
      <div class="radar-ring ring-inner"></div>
      <div class="radar-crosshair-v"></div>
      <div class="radar-crosshair-h"></div>

      <!-- Rotating Compass Indicator & Target Arrow -->
      <div
        class="target-pointer"
        style="transform: rotate({relativeBearing}deg);"
        title="ทิศทางเป้าหมายเทียบกับทิศที่โทรศัพท์หัน"
      >
        <div class="pointer-arrow">▲</div>
        <div class="target-blip"></div>
      </div>

      <div class="device-center-icon">📍</div>
    </div>

    <!-- Compass Degree & Audio Controls -->
    <div class="radar-footer">
      <div class="heading-readout">
        <span>ทิศเครื่อง: {deviceHeading}°</span>
        <span class="bearing-readout">ทิศเป้าหมาย: {Math.round(targetBearing)}° ({relativeBearing > 0 ? `ขวา ${relativeBearing}°` : `ซ้าย ${Math.abs(relativeBearing)}°`})</span>
      </div>

      <div class="actions-row">
        <button
          class="btn-toggle-sound"
          class:active={isSoundEnabled}
          on:click={() => isSoundEnabled = !isSoundEnabled}
        >
          {isSoundEnabled ? '🔊 โซนาร์เสียง: เปิด' : '🔇 โซนาร์เสียง: ปิด'}
        </button>

        <button class="btn-calibrate" on:click={() => isCalibrating = !isCalibrating}>
          {isCalibrating ? '✓ เสร็จสิ้น' : '∞ ปรับเข็มทิศ'}
        </button>
      </div>

      {#if isCalibrating}
        <div class="calibrate-box">
          <span class="cal-icon">🔄</span>
          <p>แกว่งโทรศัพท์เป็นรูปเลข 8 กลางอากาศ เพื่อปรับเทียบสนามแม่เหล็กโลก (Compass Magnetometer)</p>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .radar-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(5, 10, 20, 0.92);
    backdrop-filter: blur(8px);
    z-index: 150;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 16px;
  }

  .radar-pane {
    background: #090f1d;
    border: 2px solid #0284c7;
    box-shadow: 0 0 30px rgba(2, 132, 199, 0.3);
    border-radius: 16px;
    width: 100%;
    max-width: 440px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    color: #f1f5f9;
  }

  .radar-top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }

  .target-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid #ef4444;
    padding: 4px 10px;
    border-radius: 9999px;
    font-size: 0.8rem;
    font-weight: 700;
    color: #fca5a5;
  }

  .pulse-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ef4444;
    box-shadow: 0 0 8px #ef4444;
    animation: blink 1s infinite alternate;
  }

  .btn-close {
    background: none;
    border: none;
    color: #94a3b8;
    font-size: 1.4rem;
    cursor: pointer;
  }

  .distance-hud {
    display: flex;
    align-items: baseline;
    gap: 8px;
    background: #0f172a;
    border: 1px solid #1e293b;
    padding: 8px 16px;
    border-radius: 8px;
    width: 90%;
    justify-content: center;
  }

  .dist-label {
    font-size: 0.82rem;
    color: #94a3b8;
  }

  .dist-value {
    font-size: 1.6rem;
    color: #38bdf8;
    font-weight: 900;
  }

  .floor-tag {
    font-size: 0.75rem;
    background: #1e293b;
    padding: 2px 8px;
    border-radius: 4px;
    color: #fbbf24;
  }

  /* Circular Tactical Radar */
  .radar-screen {
    width: 240px;
    height: 240px;
    border-radius: 50%;
    background: radial-gradient(circle, #0c192d 0%, #060b14 100%);
    border: 3px solid #0284c7;
    box-shadow: 0 0 20px rgba(14, 165, 233, 0.25), inset 0 0 20px rgba(2, 132, 199, 0.3);
    position: relative;
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .radar-ring {
    position: absolute;
    border-radius: 50%;
    border: 1px dashed rgba(2, 132, 199, 0.4);
  }

  .ring-outer { width: 200px; height: 200px; }
  .ring-mid { width: 140px; height: 140px; }
  .ring-inner { width: 80px; height: 80px; }

  .radar-crosshair-v {
    position: absolute;
    width: 1px;
    height: 100%;
    background: rgba(2, 132, 199, 0.3);
  }

  .radar-crosshair-h {
    position: absolute;
    height: 1px;
    width: 100%;
    background: rgba(2, 132, 199, 0.3);
  }

  .radar-sweep-line {
    position: absolute;
    width: 120px;
    height: 120px;
    top: 0;
    left: 120px;
    transform-origin: 0% 100%;
    background: linear-gradient(45deg, rgba(56, 189, 248, 0.2) 0%, transparent 60%);
    animation: radar-sweep 4s linear infinite;
  }

  @keyframes radar-sweep {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .target-pointer {
    position: absolute;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding-top: 10px;
    transition: transform 0.2s cubic-bezier(0.1, 0.9, 0.2, 1);
  }

  .pointer-arrow {
    color: #ef4444;
    font-size: 1.8rem;
    filter: drop-shadow(0 0 8px #ef4444);
    animation: bounce-arrow 1s infinite alternate;
  }

  @keyframes bounce-arrow {
    from { transform: translateY(0); }
    to { transform: translateY(-4px); }
  }

  .device-center-icon {
    font-size: 1.2rem;
    z-index: 5;
  }

  .radar-footer {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .heading-readout {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: #94a3b8;
  }

  .bearing-readout {
    color: #38bdf8;
    font-weight: 600;
  }

  .actions-row {
    display: flex;
    gap: 8px;
    width: 100%;
  }

  .btn-toggle-sound, .btn-calibrate {
    flex: 1;
    background: #1e293b;
    border: 1px solid #334155;
    color: #e2e8f0;
    padding: 8px;
    border-radius: 6px;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-toggle-sound.active {
    background: #0369a1;
    border-color: #38bdf8;
    color: #ffffff;
  }

  .calibrate-box {
    background: #182234;
    border: 1px solid #38bdf8;
    border-radius: 6px;
    padding: 8px 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.72rem;
    color: #bae6fd;
  }

  @keyframes blink {
    0% { opacity: 0.4; }
    100% { opacity: 1; }
  }
</style>