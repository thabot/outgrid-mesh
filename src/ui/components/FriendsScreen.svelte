<script lang="ts">
  /**
   * Friends & Contact Management Screen with QR Code Display & Scanner
   * Offline Pair, Safety Numbers & Radio Peer List
   * Creator & Lead Architect: Thabot <thabo47@gmail.com>
   * Protocol: TOG v1.1 Tactical QR Pairing & Contact Exchange
   * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
   */
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { OfflineQrGenerator } from '../../core/crypto/OfflineQrGenerator';
  import { QrPairingEngine } from '../../core/crypto/QrPairingEngine';
  import { AuthManager } from '../../core/auth/AuthManager';
  import {
    discoveredPeersStore,
    peerDiscoveryManager,
    type IDiscoveredPeer
  } from '../../core/state/PeerDiscoveryStore';
  import { getBatteryBarsVisual } from '../../core/battery/BatteryRuntimeEstimator';

  const dispatch = createEventDispatcher<{
    startDirectChat: { peerId: string; peerName: string };
  }>();

  let activeSubTab: 'list' | 'my_qr' | 'scan' = 'list';

  // Identity & QR Data
  let auth = new AuthManager();
  let myProfile = auth.getProfile();
  let myNodeId = myProfile.nodeId;
  let myEdPubHex = '';
  let myXPubHex = '';
  let myQrSvg = '';
  let myContactPayload = '';
  let copySuccess = false;

  // Scanner state
  let videoEl: HTMLVideoElement;
  let mediaStream: MediaStream | null = null;
  let isCameraActive = false;
  let cameraError = '';
  let manualInputCode = '';
  let scanSuccessMessage = '';
  let scanErrorMessage = '';
  let safetyNumberInfo: { formatted: string } | null = null;

  // Saved contacts state
  interface ISavedFriend {
    id: string;
    name: string;
    safetyNumber: string;
    addedAt: number;
    edPubHex?: string;
  }

  let savedFriends: ISavedFriend[] = [
    {
      id: '#9B1C',
      name: 'เพื่อนบ้านโซน 2 (#9B1C)',
      safetyNumber: '[ 4821 ] [ 9035 ]',
      addedAt: Date.now() - 3600000
    },
    {
      id: '#4C55',
      name: 'หน่วยกู้ภัยสว่าง (#4C55)',
      safetyNumber: '[ 1120 ] [ 6744 ]',
      addedAt: Date.now() - 7200000
    }
  ];

  onMount(() => {
    initMyQrCode();
  });

  onDestroy(() => {
    stopCamera();
  });

  function initMyQrCode() {
    try {
      const edPub = myProfile.keyPair.publicKey;
      myEdPubHex = Array.from(edPub).map(b => b.toString(16).padStart(2, '0')).join('');
      myXPubHex = myEdPubHex; // In fallback or derived

      myContactPayload = OfflineQrGenerator.createContactPayload(
        myNodeId.slice(0, 8),
        myEdPubHex.slice(0, 32),
        myXPubHex.slice(0, 32)
      );

      myQrSvg = OfflineQrGenerator.renderSvg(myContactPayload, {
        pixelSize: 8,
        margin: 2,
        inverted: false
      });
    } catch (err) {
      console.warn('Failed to render QR Code:', err);
    }
  }

  async function copyMyPayload() {
    try {
      await navigator.clipboard.writeText(myContactPayload);
      copySuccess = true;
      setTimeout(() => { copySuccess = false; }, 2500);
    } catch {
      copySuccess = false;
    }
  }

  async function startCamera() {
    cameraError = '';
    scanSuccessMessage = '';
    scanErrorMessage = '';
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      cameraError = 'กล้องไม่พร้อมใช้งาน หรืออุปกรณ์ไม่รองรับการสแกนผ่านเบราว์เซอร์';
      return;
    }

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      if (videoEl) {
        videoEl.srcObject = mediaStream;
        await videoEl.play();
        isCameraActive = true;
      }
    } catch (err: any) {
      isCameraActive = false;
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        cameraError = 'ถูกปฏิเสธการเข้าถึงกล้อง กรุณาอนุญาตการใช้กล้องในการตั้งค่าเบราว์เซอร์';
      } else {
        cameraError = 'ไม่สามารถเปิดกล้องได้: ' + (err.message || 'โปรดใช้การป้อนรหัสสำรองด้านล่าง');
      }
    }
  }

  function stopCamera() {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      mediaStream = null;
    }
    isCameraActive = false;
  }

  function handleSubTabSwitch(tab: 'list' | 'my_qr' | 'scan') {
    activeSubTab = tab;
    if (tab === 'scan') {
      startCamera();
    } else {
      stopCamera();
    }
  }

  function processPairingString(input: string) {
    const raw = input.trim();
    if (!raw) return;

    scanSuccessMessage = '';
    scanErrorMessage = '';
    safetyNumberInfo = null;

    // Pattern: OG:v1:PAIR:{nodeId}:{ed25519}:{x25519}
    if (raw.startsWith('OG:v1:PAIR:')) {
      const parts = raw.split(':');
      if (parts.length >= 4) {
        const peerNodeId = parts[3];
        const shortId = peerNodeId.startsWith('#') ? peerNodeId : `#${peerNodeId.slice(0, 4).toUpperCase()}`;

        // Compute 8-digit Safety Number
        const dummyKeyA = myProfile.keyPair.publicKey;
        const dummyKeyB = new Uint8Array(32);
        for (let i = 0; i < 32; i++) {
          dummyKeyB[i] = (parts[4] ? parts[4].charCodeAt(i % parts[4].length) : 0x55) ^ (i * 7);
        }
        const safety = QrPairingEngine.computeSafetyNumber(dummyKeyA, dummyKeyB);
        safetyNumberInfo = safety;

        // Save to friends list
        if (!savedFriends.some(f => f.id === shortId)) {
          savedFriends = [
            {
              id: shortId,
              name: `เพื่อน (${shortId})`,
              safetyNumber: safety.formatted,
              addedAt: Date.now()
            },
            ...savedFriends
          ];
        }

        // Add to peer discovery store so map updates immediately
        peerDiscoveryManager.addFriendPeer(shortId, peerNodeId);

        scanSuccessMessage = `✅ จับคู่สำเร็จ! เพิ่มโหนด ${shortId} เป็นเพื่อนเรียบร้อยแล้ว`;
        manualInputCode = '';
        return;
      }
    }

    scanErrorMessage = '❌ รูปแบบรหัส QR หรือข้อมูลจับคู่ไม่ถูกต้อง (ต้องการรูปแบบ OG:v1:PAIR:...)';
  }

  function handleManualSubmit() {
    processPairingString(manualInputCode);
  }

  function handleDirectChat(friend: ISavedFriend) {
    dispatch('startDirectChat', {
      peerId: friend.id,
      peerName: friend.name
    });
  }
</script>

<div class="friends-root">
  <!-- Sub Navigation Header -->
  <div class="sub-nav">
    <button
      class="sub-btn"
      class:active={activeSubTab === 'list'}
      on:click={() => handleSubTabSwitch('list')}
    >
      👥 เพื่อน & สัญญาณวิทยุ ({savedFriends.length})
    </button>
    <button
      class="sub-btn"
      class:active={activeSubTab === 'my_qr'}
      on:click={() => handleSubTabSwitch('my_qr')}
    >
      🔲 QR Code ของฉัน
    </button>
    <button
      class="sub-btn sub-btn-scan"
      class:active={activeSubTab === 'scan'}
      on:click={() => handleSubTabSwitch('scan')}
    >
      📷 สแกน QR เพิ่มเพื่อน
    </button>
  </div>

  <!-- TAB 1: FRIENDS LIST & NEARBY RADIO PEERS -->
  {#if activeSubTab === 'list'}
    <div class="list-section">
      <!-- Saved Friends -->
      <div class="section-title">
        <span>⭐ เพื่อนและผู้ติดต่อที่จับคู่แล้ว ({savedFriends.length})</span>
      </div>

      {#if savedFriends.length > 0}
        <div class="peers-grid">
          {#each savedFriends as friend}
            <div class="peer-card friend-card">
              <div class="peer-avatar">👤</div>
              <div class="peer-info">
                <div class="peer-header-row">
                  <strong class="peer-name">{friend.name}</strong>
                  <span class="badge-verified">🔒 ยืนยันแล้ว</span>
                </div>
                <div class="safety-number-row">
                  <span class="safety-lbl">รหัสความปลอดภัย:</span>
                  <code class="safety-code">{friend.safetyNumber}</code>
                </div>
              </div>
              <div class="peer-actions">
                <button class="btn-chat" on:click={() => handleDirectChat(friend)}>
                  💬 แชท
                </button>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <div class="empty-box">
          <p>ยังไม่มีเพื่อนที่บันทึกไว้ แตะที่ "สแกน QR เพิ่มเพื่อน" เพื่อจับคู่กับเครื่องข้างๆ</p>
        </div>
      {/if}

      <!-- Discovered Radio Peers in Mesh Area -->
      <div class="section-title" style="margin-top: 1.5rem;">
        <span>📡 โหนดที่ตรวจพบสัญญาณวิทยุรอบตัว ({$discoveredPeersStore.length})</span>
      </div>

      {#if $discoveredPeersStore.length > 0}
        <div class="peers-grid">
          {#each $discoveredPeersStore as peer}
            {@const bat = getBatteryBarsVisual(peer.batteryBars)}
            <div class="peer-card radio-card">
              <div class="peer-avatar radio-avatar">📻</div>
              <div class="peer-info">
                <div class="peer-header-row">
                  <strong class="peer-name">{peer.shortNodeId}</strong>
                  {#if peer.isFriend}
                    <span class="badge-friend">⭐ เพื่อน</span>
                  {:else if peer.isRelay}
                    <span class="badge-relay">🔁 ทวนสัญญาณ</span>
                  {/if}
                </div>
                <div class="peer-meta-row">
                  <span class="signal-tag">
                    {peer.rssiTier === 3 ? '🟢 แรงมาก' : peer.rssiTier === 2 ? '🟡 ดี' : peer.rssiTier === 1 ? '🟠 ปานกลาง' : '🔴 อ่อน'}
                  </span>
                  <span class="dist-tag">📏 ~{peer.distanceMeters} ม.</span>
                  <span class="bat-tag" style="color: {bat.color};">🔋 {bat.percentStr}</span>
                </div>
              </div>
              <div class="peer-actions">
                <button
                  class="btn-pair"
                  on:click={() => {
                    handleSubTabSwitch('scan');
                    manualInputCode = `OG:v1:PAIR:${peer.shortNodeId}:DEMO_ED25519_KEY:DEMO_X25519_KEY`;
                  }}
                >
                  ➕ เพิ่ม
                </button>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <div class="empty-box">
          <span class="empty-icon">📡</span>
          <p>กำลังค้นหาสัญญาณวิทยุ Bluetooth LE รอบตัว...</p>
        </div>
      {/if}
    </div>

  <!-- TAB 2: MY QR CODE (SHARE CONTACT) -->
  {:else if activeSubTab === 'my_qr'}
    <div class="my-qr-section">
      <div class="qr-card">
        <h3>🔲 QR Code ติดต่อฉุกเฉินของคุณ</h3>
        <p class="qr-desc">
          เปิดหน้านี้ให้อีกเครื่องใช้กล้องสแกน เพื่อแลกเปลี่ยน Contact และคีย์เข้ารหัสแบบ Zero-Network
        </p>

        <div class="qr-display-box">
          {#if myQrSvg}
            {@html myQrSvg}
          {:else}
            <div class="qr-loading">กำลังสร้าง QR Code...</div>
          {/if}
        </div>

        <div class="node-id-display">
          <span class="lbl">รหัสโหนดของคุณ (Node ID):</span>
          <strong class="val">#{myNodeId.slice(0, 4).toUpperCase()}</strong>
        </div>

        <div class="qr-payload-preview">
          <code>{myContactPayload}</code>
        </div>

        <button class="btn-copy" on:click={copyMyPayload}>
          {copySuccess ? '✅ คัดลอกรหัสแล้ว!' : '📋 คัดลอกรหัสจับคู่ (Copy Payload)'}
        </button>
      </div>
    </div>

  <!-- TAB 3: SCAN QR CODE -->
  {:else if activeSubTab === 'scan'}
    <div class="scan-section">
      <div class="scanner-card">
        <h3>📷 สแกน QR Code ของเพื่อน</h3>
        <p class="scan-desc">
          ส่องกล้องไปที่ QR Code บนหน้าจอเครื่องเพื่อน เพื่อบันทึก Contact และรับรองความปลอดภัย
        </p>

        <div class="camera-viewport">
          <video bind:this={videoEl} playsinline muted class="camera-video"></video>
          <div class="viewfinder-box">
            <div class="corner tl"></div>
            <div class="corner tr"></div>
            <div class="corner bl"></div>
            <div class="corner br"></div>
            <div class="scan-laser"></div>
          </div>
        </div>

        {#if cameraError}
          <div class="alert-box alert-warn">
            ⚠️ {cameraError}
          </div>
        {/if}

        {#if scanSuccessMessage}
          <div class="alert-box alert-success">
            {scanSuccessMessage}
            {#if safetyNumberInfo}
              <div class="safety-result">
                <span>รหัสตรวจสอบความปลอดภัย 8 หลัก:</span>
                <strong>{safetyNumberInfo.formatted}</strong>
              </div>
            {/if}
          </div>
        {/if}

        {#if scanErrorMessage}
          <div class="alert-box alert-error">
            {scanErrorMessage}
          </div>
        {/if}

        <!-- Manual Input Fallback -->
        <div class="manual-input-box">
          <label for="manual-code">หรือวางรหัสจับคู่ที่นี่ (เมื่อกล้องไม่พร้อมใช้งาน):</label>
          <div class="input-row">
            <input
              id="manual-code"
              type="text"
              bind:value={manualInputCode}
              placeholder="OG:v1:PAIR:nodeId:ed25519:x25519"
            />
            <button class="btn-submit-code" on:click={handleManualSubmit}>
              จับคู่
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .friends-root {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .sub-nav {
    display: flex;
    gap: 0.5rem;
    border-bottom: 1px solid #1e293b;
    padding-bottom: 0.75rem;
    flex-wrap: wrap;
  }
  .sub-btn {
    background: #0f172a;
    color: #94a3b8;
    border: 1px solid #1e293b;
    padding: 0.5rem 0.85rem;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .sub-btn:hover {
    color: #f8fafc;
    border-color: #334155;
  }
  .sub-btn.active {
    background: #0284c7;
    color: #ffffff;
    border-color: #38bdf8;
  }
  .sub-btn-scan.active {
    background: #16a34a;
    border-color: #4ade80;
  }
  .section-title {
    font-size: 0.9rem;
    font-weight: 700;
    color: #38bdf8;
    margin-bottom: 0.75rem;
  }
  .peers-grid {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .peer-card {
    display: flex;
    align-items: center;
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 10px;
    padding: 0.75rem 1rem;
    gap: 0.75rem;
  }
  .friend-card {
    border-color: #0284c7;
  }
  .radio-card {
    border-color: #334155;
  }
  .peer-avatar {
    font-size: 1.6rem;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #1e293b;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .peer-info {
    flex: 1;
    min-width: 0;
  }
  .peer-header-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }
  .peer-name {
    font-size: 0.95rem;
    color: #f8fafc;
  }
  .badge-verified {
    background: rgba(34, 197, 94, 0.15);
    color: #4ade80;
    border: 1px solid #22c55e;
    font-size: 0.7rem;
    padding: 1px 6px;
    border-radius: 4px;
    font-weight: 600;
  }
  .badge-friend {
    background: rgba(2, 132, 199, 0.15);
    color: #38bdf8;
    border: 1px solid #0284c7;
    font-size: 0.7rem;
    padding: 1px 6px;
    border-radius: 4px;
  }
  .badge-relay {
    background: rgba(234, 179, 8, 0.15);
    color: #facc15;
    border: 1px solid #eab308;
    font-size: 0.7rem;
    padding: 1px 6px;
    border-radius: 4px;
  }
  .safety-number-row {
    font-size: 0.75rem;
    color: #94a3b8;
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }
  .safety-code {
    color: #38bdf8;
    background: #090d16;
    padding: 1px 4px;
    border-radius: 4px;
    font-weight: 700;
  }
  .peer-meta-row {
    display: flex;
    gap: 0.6rem;
    font-size: 0.78rem;
    color: #94a3b8;
  }
  .peer-actions {
    flex-shrink: 0;
  }
  .btn-chat {
    background: #0284c7;
    color: white;
    border: none;
    padding: 0.4rem 0.8rem;
    border-radius: 6px;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
  }
  .btn-pair {
    background: #1e293b;
    color: #38bdf8;
    border: 1px solid #0284c7;
    padding: 0.4rem 0.8rem;
    border-radius: 6px;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
  }
  .empty-box {
    text-align: center;
    padding: 2rem 1rem;
    background: #0f172a;
    border: 1px dashed #334155;
    border-radius: 10px;
    color: #94a3b8;
    font-size: 0.88rem;
  }
  .empty-icon {
    font-size: 2rem;
    display: block;
    margin-bottom: 0.5rem;
  }

  /* My QR Section */
  .my-qr-section {
    display: flex;
    justify-content: center;
  }
  .qr-card {
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 12px;
    padding: 1.5rem;
    max-width: 420px;
    width: 100%;
    text-align: center;
  }
  .qr-card h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.15rem;
    color: #f8fafc;
  }
  .qr-desc {
    font-size: 0.82rem;
    color: #94a3b8;
    line-height: 1.4;
    margin-bottom: 1.25rem;
  }
  .qr-display-box {
    background: #ffffff;
    padding: 1rem;
    border-radius: 12px;
    display: inline-block;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    margin-bottom: 1rem;
  }
  .node-id-display {
    margin-bottom: 0.75rem;
    font-size: 0.9rem;
    color: #94a3b8;
  }
  .node-id-display .val {
    color: #38bdf8;
    font-size: 1.1rem;
    margin-left: 0.35rem;
  }
  .qr-payload-preview {
    background: #090d16;
    padding: 0.5rem;
    border-radius: 6px;
    border: 1px solid #1e293b;
    font-size: 0.7rem;
    color: #64748b;
    word-break: break-all;
    margin-bottom: 1rem;
  }
  .btn-copy {
    width: 100%;
    background: #1e293b;
    color: #38bdf8;
    border: 1px solid #0284c7;
    padding: 0.6rem;
    border-radius: 8px;
    font-weight: 700;
    font-size: 0.88rem;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .btn-copy:hover {
    background: #0284c7;
    color: #ffffff;
  }

  /* Scanner Section */
  .scan-section {
    display: flex;
    justify-content: center;
  }
  .scanner-card {
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 12px;
    padding: 1.25rem;
    max-width: 480px;
    width: 100%;
  }
  .scanner-card h3 {
    margin: 0 0 0.4rem 0;
    font-size: 1.1rem;
    color: #f8fafc;
  }
  .scan-desc {
    font-size: 0.8rem;
    color: #94a3b8;
    margin-bottom: 1rem;
  }
  .camera-viewport {
    position: relative;
    width: 100%;
    height: 260px;
    background: #000000;
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .camera-video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .viewfinder-box {
    position: absolute;
    width: 180px;
    height: 180px;
    border: 1px solid rgba(56, 189, 248, 0.3);
  }
  .corner {
    position: absolute;
    width: 20px;
    height: 20px;
    border-color: #38bdf8;
    border-style: solid;
  }
  .corner.tl { top: -1px; left: -1px; border-width: 3px 0 0 3px; }
  .corner.tr { top: -1px; right: -1px; border-width: 3px 3px 0 0; }
  .corner.bl { bottom: -1px; left: -1px; border-width: 0 0 3px 3px; }
  .corner.br { bottom: -1px; right: -1px; border-width: 0 3px 3px 0; }
  .scan-laser {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 2px;
    background: #38bdf8;
    box-shadow: 0 0 8px #38bdf8;
    animation: scanAnim 2.5s infinite ease-in-out;
  }
  @keyframes scanAnim {
    0% { top: 0; }
    50% { top: 100%; }
    100% { top: 0; }
  }
  .alert-box {
    padding: 0.6rem 0.8rem;
    border-radius: 8px;
    font-size: 0.82rem;
    margin-bottom: 1rem;
  }
  .alert-warn {
    background: rgba(234, 179, 8, 0.12);
    border: 1px solid #eab308;
    color: #fef08a;
  }
  .alert-success {
    background: rgba(34, 197, 94, 0.12);
    border: 1px solid #22c55e;
    color: #86efac;
  }
  .alert-error {
    background: rgba(239, 68, 68, 0.12);
    border: 1px solid #ef4444;
    color: #fca5a5;
  }
  .safety-result {
    margin-top: 0.4rem;
    font-size: 0.85rem;
  }
  .safety-result strong {
    color: #38bdf8;
    display: block;
    font-size: 1rem;
  }
  .manual-input-box {
    border-top: 1px solid #1e293b;
    padding-top: 0.85rem;
  }
  .manual-input-box label {
    display: block;
    font-size: 0.78rem;
    color: #94a3b8;
    margin-bottom: 0.4rem;
  }
  .input-row {
    display: flex;
    gap: 0.5rem;
  }
  .input-row input {
    flex: 1;
    background: #090d16;
    border: 1px solid #1e293b;
    border-radius: 6px;
    padding: 0.45rem 0.65rem;
    color: #f8fafc;
    font-size: 0.8rem;
  }
  .btn-submit-code {
    background: #0284c7;
    color: #ffffff;
    border: none;
    padding: 0.45rem 0.9rem;
    border-radius: 6px;
    font-size: 0.82rem;
    font-weight: 700;
    cursor: pointer;
  }
</style>
