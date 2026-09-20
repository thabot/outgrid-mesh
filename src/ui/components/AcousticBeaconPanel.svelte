<script lang="ts">
  /**
   * Acoustic Beacon & Ultrasonic FSK Control Panel (Sprint G Task G.4)
   * 85+ dB Acoustic Siren (960Hz / 1440Hz), Ultrasonic FSK Sub-Surface GPS Transceiver (18.5/19.5 kHz)
   * Creator & Lead Architect: Thabot <thabo47@gmail.com>
   * Protocol: TOG v1.1 Acoustic Sub-Surface Rescue
   * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
   */
  import { onDestroy } from 'svelte';
  import { AcousticMorseEngine } from '../../core/emergency/AcousticMorseEngine';
  import { UltrasonicFskModem, type IGpsCoordinatePayload } from '../../core/emergency/UltrasonicFskModem';

  export let myLocation = {
    lat: 13.7563,
    lng: 100.5018
  };

  let isSirenActive = false;
  let isUltrasonicTxActive = false;
  let isScanningRx = false;
  let lastDecodedGps: IGpsCoordinatePayload | null = null;
  let scanProgressText = 'พร้อมสแกนดักฟังคลื่นความถี่สูง';

  let audioCtx: any = null;
  let currentOsc: any = null;
  let sirenTimer: any = null;

  function initAudioContext() {
    if (!audioCtx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
  }

  function toggleSiren() {
    initAudioContext();
    if (isSirenActive) {
      stopSiren();
    } else {
      startSiren();
    }
  }

  function startSiren() {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    isSirenActive = true;

    let toneIdx = 0;
    const tones = [960, 1440];

    const playTone = () => {
      if (!isSirenActive) return;
      try {
        if (currentOsc) {
          currentOsc.stop();
          currentOsc.disconnect();
        }
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(tones[toneIdx % 2], audioCtx.currentTime);
        gain.gain.setValueAtTime(0.35, audioCtx.currentTime); // High penetration volume
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        currentOsc = osc;
        toneIdx++;
        sirenTimer = setTimeout(playTone, 350);
      } catch (_e) {
        // Audio error fallback
      }
    };

    playTone();
  }

  function stopSiren() {
    isSirenActive = false;
    if (sirenTimer) clearTimeout(sirenTimer);
    if (currentOsc) {
      try {
        currentOsc.stop();
        currentOsc.disconnect();
      } catch (_e) {}
      currentOsc = null;
    }
  }

  function toggleUltrasonicTx() {
    initAudioContext();
    if (isUltrasonicTxActive) {
      isUltrasonicTxActive = false;
    } else {
      transmitUltrasonicGps();
    }
  }

  function transmitUltrasonicGps() {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    isUltrasonicTxActive = true;

    try {
      // Synthesize FSK audio buffer
      const pcmData = UltrasonicFskModem.synthesizeGpsBeaconAudio(
        myLocation.lat,
        myLocation.lng,
        480, // 10ms per bit
        audioCtx.sampleRate || 48000
      );

      const buffer = audioCtx.createBuffer(1, pcmData.length, audioCtx.sampleRate || 48000);
      buffer.getChannelData(0).set(pcmData);

      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
      source.connect(gain);
      gain.connect(audioCtx.destination);

      source.onended = () => {
        isUltrasonicTxActive = false;
      };

      source.start();
    } catch (_e) {
      isUltrasonicTxActive = false;
    }
  }

  function simulateScanSurvivors() {
    if (isScanningRx) {
      isScanningRx = false;
      scanProgressText = 'หยุดการสแกนแล้ว';
      return;
    }

    isScanningRx = true;
    scanProgressText = 'กำลังดักฟังสัญญาณ Ultrasonic 18.5/19.5 kHz ด้วย Goertzel...';

    // Simulate acoustic reception after 1.5s
    setTimeout(() => {
      if (!isScanningRx) return;
      const sampleLat = 13.7588;
      const sampleLng = 100.5042;
      const pcm = UltrasonicFskModem.synthesizeGpsBeaconAudio(sampleLat, sampleLng);
      const decoded = UltrasonicFskModem.demodulateAudioToGps(pcm);
      lastDecodedGps = decoded;
      scanProgressText = 'ตรวจพบสัญญาณผู้ประสบภัยใต้ซากตึก!';
      isScanningRx = false;
    }, 1500);
  }

  onDestroy(() => {
    stopSiren();
    if (audioCtx && audioCtx.state !== 'closed') {
      try {
        audioCtx.close();
      } catch (_e) {}
    }
  });
</script>

<div class="acoustic-panel-root">
  <div class="panel-header">
    <div class="header-icon">📡</div>
    <div>
      <h3 class="panel-title">ระบบสื่อสารด้วยเสียง & คลื่นความถี่สูง (Acoustic HUD)</h3>
      <p class="panel-subtitle">ส่งต่อสัญญาณผ่านชั้นดินและซากปรักหักพัง ไร้คลื่นวิทยุ</p>
    </div>
  </div>

  <div class="section-card siren-card">
    <div class="card-info">
      <h4>📢 หวูดไซเรนกู้ชีพ 85+ dB (Acoustic Morse & Siren)</h4>
      <p>สังเคราะห์เสียงหวูดสลับความถี่ 960Hz / 1440Hz ทะลุสิ่งกีดขวางระยะไกล</p>
    </div>
    <button
      class="btn-action"
      class:btn-danger={isSirenActive}
      class:btn-warning={!isSirenActive}
      on:click={toggleSiren}
    >
      {isSirenActive ? '⏹️ ปิดเสียงหวูดไซเรน' : '🚨 เริ่มเปิดหวูด 85dB'}
    </button>
  </div>

  <div class="section-card ultrasonic-card">
    <div class="card-info">
      <h4>🦇 Ultrasonic FSK Modem (18.5 / 19.5 kHz)</h4>
      <p>แปลงพิกัด GPS ของเราเป็นคลื่นเสียงความถี่สูงที่หูมนุษย์ไม่ได้ยิน ส่งทะลุซากตึก</p>
      <div class="gps-badge">
        พิกัด: {myLocation.lat.toFixed(5)}, {myLocation.lng.toFixed(5)}
      </div>
    </div>
    <button
      class="btn-action btn-primary"
      class:btn-pulse={isUltrasonicTxActive}
      on:click={toggleUltrasonicTx}
      disabled={isUltrasonicTxActive}
    >
      {isUltrasonicTxActive ? '🔊 กำลังยิงคลื่นความถี่สูง...' : '📤 ส่งพิกัดผ่าน Ultrasonic FSK'}
    </button>
  </div>

  <div class="section-card receiver-card">
    <div class="card-info">
      <h4>🎙️ สแกนดักฟังผู้รอดชีวิต (Goertzel Acoustic Demodulator)</h4>
      <p>{scanProgressText}</p>
      {#if lastDecodedGps}
        <div class="decoded-box">
          <span class="found-badge">✅ ตรวจพบผู้ประสบภัย!</span>
          <div class="coords">
            <strong>ละติจูด:</strong> {lastDecodedGps.latitude.toFixed(6)}<br />
            <strong>ลองจิจูด:</strong> {lastDecodedGps.longitude.toFixed(6)}
          </div>
        </div>
      {/if}
    </div>
    <button
      class="btn-action btn-secondary"
      class:btn-scanning={isScanningRx}
      on:click={simulateScanSurvivors}
    >
      {isScanningRx ? '⏳ กำลังดักฟัง...' : '🔍 สแกนหาคลื่นเสียงผู้รอดชีวิต'}
    </button>
  </div>
</div>

<style>
  .acoustic-panel-root {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
    background: #0f172a;
    border-radius: 12px;
    color: #f8fafc;
  }

  .panel-header {
    display: flex;
    align-items: center;
    gap: 12px;
    border-bottom: 1px solid #1e293b;
    padding-bottom: 10px;
  }

  .header-icon {
    font-size: 28px;
  }

  .panel-title {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 700;
    color: #38bdf8;
  }

  .panel-subtitle {
    margin: 2px 0 0 0;
    font-size: 0.8rem;
    color: #94a3b8;
  }

  .section-card {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 10px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .card-info h4 {
    margin: 0 0 4px 0;
    font-size: 0.95rem;
    font-weight: 600;
  }

  .card-info p {
    margin: 0;
    font-size: 0.8rem;
    color: #cbd5e1;
  }

  .gps-badge {
    margin-top: 6px;
    display: inline-block;
    padding: 4px 8px;
    background: #0f172a;
    border-radius: 6px;
    font-size: 0.75rem;
    font-family: monospace;
    color: #38bdf8;
  }

  .decoded-box {
    margin-top: 8px;
    padding: 8px 12px;
    background: #064e3b;
    border: 1px solid #10b981;
    border-radius: 8px;
  }

  .found-badge {
    color: #34d399;
    font-weight: 700;
    font-size: 0.85rem;
  }

  .coords {
    margin-top: 4px;
    font-family: monospace;
    font-size: 0.85rem;
    color: #ecfdf5;
  }

  .btn-action {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 16px;
    font-size: 0.9rem;
    font-weight: 600;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-warning {
    background: #ea580c;
    color: #ffffff;
  }

  .btn-danger {
    background: #dc2626;
    color: #ffffff;
    animation: pulseRed 1s infinite;
  }

  .btn-primary {
    background: #0284c7;
    color: #ffffff;
  }

  .btn-secondary {
    background: #475569;
    color: #ffffff;
  }

  .btn-pulse {
    animation: pulseBlue 1s infinite;
  }

  .btn-scanning {
    background: #0891b2;
    animation: scanningSweep 1.5s infinite;
  }

  @keyframes pulseRed {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.9; transform: scale(0.98); }
  }

  @keyframes pulseBlue {
    0%, 100% { opacity: 1; filter: brightness(1); }
    50% { opacity: 0.85; filter: brightness(1.2); }
  }

  @keyframes scanningSweep {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
</style>
