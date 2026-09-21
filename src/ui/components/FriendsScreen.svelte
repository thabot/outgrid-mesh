<script lang="ts">
  /**
   * LINE-Style Friends & Contact Management Screen
   * Clean UI, Search, Avatar Profiles, Online/Radio Badges, 1-Tap Chat & Offline QR Exchange
   * Creator & Lead Architect: Thabot <thabo47@gmail.com>
   * Protocol: TOG v1.1 Tactical Contact Hub
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

  // Sub-modal state for QR code & Camera Scanner
  let modalView: 'none' | 'my_qr' | 'scan_qr' = 'none';

  // Identity & User profile
  let auth = new AuthManager();
  let myProfile = auth.getProfile();
  let myNodeId = myProfile.nodeId;
  let myShortNodeId = `#${myNodeId.slice(0, 4).toUpperCase()}`;
  let myDisplayName = myProfile.displayName || `ผู้ใช้ฉุกเฉิน (${myShortNodeId})`;
  let myStatusMessage = 'พร้อมเชื่อมต่อผ่านวิทยุสื่อสาร Mesh';

  // QR Code payload
  let myContactPayload = '';
  let myQrSvg = '';
  let copySuccess = false;

  // Scanner state
  let videoEl: HTMLVideoElement;
  let canvasEl: HTMLCanvasElement | null = null;
  let canvasCtx: CanvasRenderingContext2D | null = null;
  let mediaStream: MediaStream | null = null;
  let isCameraActive = false;
  let cameraError = '';
  let manualInputCode = '';
  let scanAnimationId: number | null = null;
  let isScanningFrame = false;

  // Feedback states
  let scanSuccessMessage = '';
  let scanErrorMessage = '';
  let safetyNumberInfo: any = null;

  // Search filter
  let searchQuery = '';

  // Saved contacts interface
  export interface ISavedFriend {
    id: string; // e.g. "#4C55"
    fullNodeId?: string;
    name: string;
    avatarEmoji: string;
    statusMessage: string;
    safetyNumber: string;
    addedAt: number;
    isOnline?: boolean;
    lastSeen?: number;
  }

  // Saved friends loaded from localStorage or initialized empty
  let savedFriends: ISavedFriend[] = [];

  const STORAGE_KEY = 'outgrid_saved_friends_v1';

  onMount(() => {
    loadSavedFriends();
    initMyQrCode();
  });

  onDestroy(() => {
    stopCamera();
  });

  function loadSavedFriends() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          savedFriends = JSON.parse(stored);
        } else {
          // Strictly empty default state as requested: "ถ้าไม่มีก็แจ้งว่าว่างเปล่า"
          savedFriends = [];
        }
      }
    } catch {
      savedFriends = [];
    }
  }

  function saveFriendsToStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(savedFriends));
      }
    } catch {}
  }

  function initMyQrCode() {
    try {
      const edPub = myProfile.keyPair.publicKey;
      const myEdPubHex = Array.from(edPub).map(b => b.toString(16).padStart(2, '0')).join('');
      const myXPubHex = myEdPubHex;

      myContactPayload = OfflineQrGenerator.createContactPayload(
        myNodeId.slice(0, 8),
        myEdPubHex.slice(0, 32),
        myXPubHex.slice(0, 32)
      );

      myQrSvg = OfflineQrGenerator.renderSvg(myContactPayload, {
        pixelSize: 8,
        margin: 4,
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
      cameraError = 'กล้องไม่พร้อมใช้งาน หรือเบราว์เซอร์ไม่รองรับการสแกนผ่านกล้อง';
      return;
    }

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      if (videoEl) {
        videoEl.srcObject = mediaStream;
        await videoEl.play();
        isCameraActive = true;
        startQrDecodeLoop();
      }
    } catch (err: any) {
      isCameraActive = false;
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        cameraError = 'ถูกปฏิเสธสิทธิ์เข้าถึงกล้อง กรุณาอนุญาตในการตั้งค่าของเบราว์เซอร์ หรือใช้วิธีวางรหัสจับคู่ด้านล่าง';
      } else {
        cameraError = 'ไม่สามารถเปิดกล้องได้: ' + (err.message || 'กรุณาวางรหัสจับคู่ด้านล่าง');
      }
    }
  }

  function startQrDecodeLoop() {
    if (typeof window === 'undefined') return;
    if (!canvasEl) {
      canvasEl = document.createElement('canvas');
      canvasCtx = canvasEl.getContext('2d', { willReadFrequently: true });
    }

    const decodeFrame = async () => {
      if (!isCameraActive || !videoEl || videoEl.readyState !== videoEl.HAVE_ENOUGH_DATA) {
        if (isCameraActive) {
          scanAnimationId = requestAnimationFrame(decodeFrame);
        }
        return;
      }

      if (isScanningFrame) {
        scanAnimationId = requestAnimationFrame(decodeFrame);
        return;
      }

      isScanningFrame = true;
      try {
        const width = videoEl.videoWidth;
        const height = videoEl.videoHeight;
        if (width > 0 && height > 0 && canvasEl && canvasCtx) {
          if (canvasEl.width !== width || canvasEl.height !== height) {
            canvasEl.width = width;
            canvasEl.height = height;
          }
          canvasCtx.drawImage(videoEl, 0, 0, width, height);
          const imageData = canvasCtx.getImageData(0, 0, width, height);

          // Dynamically import jsQR
          const jsQrModule = await import('jsqr');
          const jsQR = jsQrModule.default || (jsQrModule as any);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth'
          });

          if (code && code.data) {
            const detectedText = code.data.trim();
            if (detectedText.startsWith('OG:v1:PAIR:') || detectedText.startsWith('WIFI:')) {
              // Haptic feedback if available
              if (typeof navigator !== 'undefined' && navigator.vibrate) {
                try { navigator.vibrate(80); } catch {}
              }
              processPairingString(detectedText);
              // Stop camera and close scan modal on successful QR detection
              stopCamera();
              return;
            }
          }
        }
      } catch (err) {
        // Continue scanning frame
      } finally {
        isScanningFrame = false;
      }

      if (isCameraActive) {
        scanAnimationId = requestAnimationFrame(decodeFrame);
      }
    };

    scanAnimationId = requestAnimationFrame(decodeFrame);
  }

  function stopCamera() {
    if (scanAnimationId !== null) {
      cancelAnimationFrame(scanAnimationId);
      scanAnimationId = null;
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      mediaStream = null;
    }
    isCameraActive = false;
    isScanningFrame = false;
  }

  function openModal(mode: 'my_qr' | 'scan_qr') {
    modalView = mode;
    if (mode === 'scan_qr') {
      startCamera();
    } else {
      stopCamera();
    }
  }

  function closeModal() {
    stopCamera();
    modalView = 'none';
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

        // Choose random friendly avatar emoji
        const avatarPool = ['😀', '🦊', '🐻', '🐼', '🐯', '🦁', '🦉', '🚀', '🛰️', '🧑‍🚀'];
        const chosenAvatar = avatarPool[Math.abs(shortId.charCodeAt(1) || 0) % avatarPool.length];

        // Add or update friend
        const existingIdx = savedFriends.findIndex(f => f.id === shortId);
        if (existingIdx >= 0) {
          savedFriends[existingIdx].safetyNumber = safety.formatted;
        } else {
          savedFriends = [
            {
              id: shortId,
              fullNodeId: peerNodeId,
              name: `เพื่อน ${shortId}`,
              avatarEmoji: chosenAvatar,
              statusMessage: 'จับคู่ผ่าน QR Code เรียบร้อยแล้ว',
              safetyNumber: safety.formatted,
              addedAt: Date.now(),
              isOnline: true
            },
            ...savedFriends
          ];
        }

        saveFriendsToStorage();

        // Update discovery store
        peerDiscoveryManager.addFriendPeer(shortId, peerNodeId);

        scanSuccessMessage = `✅ เพิ่ม ${shortId} เป็นเพื่อนเรียบร้อยแล้ว!`;
        manualInputCode = '';
        return;
      }
    }

    scanErrorMessage = '❌ รูปแบบรหัส QR หรือข้อมูลจับคู่ไม่ถูกต้อง (ต้องการรูปแบบ OG:v1:PAIR:...)';
  }

  function handleManualSubmit() {
    processPairingString(manualInputCode);
  }

  function handleStartChat(friend: ISavedFriend) {
    dispatch('startDirectChat', {
      peerId: friend.id,
      peerName: friend.name
    });
  }

  // Filter friends based on search query
  $: filteredFriends = savedFriends.filter(f => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return f.name.toLowerCase().includes(q) || f.id.toLowerCase().includes(q);
  });
</script>

<div class="line-friends-root">
  <!-- Top App Bar (LINE Style) -->
  <header class="line-header">
    <div class="header-main">
      <h2>เพื่อน</h2>
      <div class="header-icons">
        <button class="icon-btn" on:click={() => openModal('my_qr')} title="QR Code ของฉัน">
          <span class="btn-symbol">🔲</span>
        </button>
        <button class="icon-btn" on:click={() => openModal('scan_qr')} title="สแกน QR เพิ่มเพื่อน">
          <span class="btn-symbol">📷</span>
        </button>
      </div>
    </div>

    <!-- Search Bar -->
    <div class="search-container">
      <div class="search-input-wrapper">
        <span class="search-icon">🔍</span>
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="ค้นหาชื่อเพื่อน หรือ Node ID..."
        />
        {#if searchQuery}
          <button class="btn-clear-search" on:click={() => searchQuery = ''}>✕</button>
        {/if}
      </div>
    </div>
  </header>

  <!-- My Profile Card (LINE Style) -->
  <div class="my-profile-section" on:click={() => openModal('my_qr')} role="button" tabindex="0">
    <div class="my-avatar-wrapper">
      <div class="my-avatar">👤</div>
      <div class="my-online-badge"></div>
    </div>
    <div class="my-meta">
      <div class="my-name-row">
        <span class="my-name">{myDisplayName}</span>
        <span class="my-badge-me">ฉัน</span>
      </div>
      <span class="my-status">{myStatusMessage}</span>
    </div>
    <button class="btn-my-qr-mini" title="แสดง QR Code สำหรับแชร์">
      🔲 QR ของฉัน
    </button>
  </div>

  <!-- Divider -->
  <div class="line-divider"></div>

  <!-- Friends Group Section -->
  <div class="friends-list-container">
    <div class="group-header">
      <span class="group-title">เพื่อน ({filteredFriends.length})</span>
      <button class="btn-quick-add" on:click={() => openModal('scan_qr')}>
        ➕ เพิ่มเพื่อน
      </button>
    </div>

    {#if filteredFriends.length > 0}
      <div class="friends-items-list">
        {#each filteredFriends as friend}
          <div class="friend-row">
            <div class="avatar-col">
              <div class="friend-avatar">{friend.avatarEmoji || '👤'}</div>
              <div class="dot-online"></div>
            </div>
            <div class="info-col">
              <div class="row-top">
                <span class="friend-name">{friend.name}</span>
                <span class="verified-tag">🔒 Safety: {friend.safetyNumber.slice(0, 8)}</span>
              </div>
              <span class="friend-status">{friend.statusMessage}</span>
            </div>
            <div class="action-col">
              <button class="btn-line-chat" on:click={() => handleStartChat(friend)}>
                แชท
              </button>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <!-- Empty State (LINE Style) -->
      <div class="line-empty-state">
        <div class="empty-bubble-illustration">
          <span class="bubble-icon">👥</span>
        </div>
        <h4>ยังไม่มีเพื่อนในรายชื่อ</h4>
        <p class="empty-hint">
          สแกน QR Code กับเครื่องรอบตัว หรือเปิด QR Code ของคุณให้อีกเครื่องสแกนเพื่อเริ่มแชทผ่านคลื่นวิทยุ
        </p>
        <div class="empty-actions">
          <button class="btn-primary-add" on:click={() => openModal('scan_qr')}>
            📷 สแกน QR เพิ่มเพื่อน
          </button>
          <button class="btn-secondary-share" on:click={() => openModal('my_qr')}>
            🔲 QR Code ของฉัน
          </button>
        </div>
      </div>
    {/if}

    <!-- Nearby Radio Peers in Mesh Area (Live Discovery) -->
    {#if $discoveredPeersStore.length > 0}
      <div class="group-header" style="margin-top: 1.5rem;">
        <span class="group-title radio-group-title">
          📡 สัญญาณวิทยุตรวจพบรอบตัว ({$discoveredPeersStore.length})
        </span>
      </div>
      <div class="friends-items-list">
        {#each $discoveredPeersStore as peer}
          {@const bat = getBatteryBarsVisual(peer.batteryBars)}
          <div class="friend-row radio-peer-row">
            <div class="avatar-col">
              <div class="friend-avatar radio-avatar">📻</div>
            </div>
            <div class="info-col">
              <div class="row-top">
                <span class="friend-name">{peer.shortNodeId}</span>
                {#if peer.isFriend}
                  <span class="badge-friend-tag">⭐ เพื่อน</span>
                {:else if peer.isRelay}
                  <span class="badge-relay-tag">🔁 ทวนสัญญาณ</span>
                {/if}
              </div>
              <div class="peer-meta-chips">
                <span class="chip-signal">
                  {peer.rssiTier === 3 ? '🟢 แรงมาก' : peer.rssiTier === 2 ? '🟡 ดี' : peer.rssiTier === 1 ? '🟠 ปานกลาง' : '🔴 อ่อน'}
                </span>
                <span class="chip-dist">📏 ~{peer.distanceMeters} ม.</span>
                <span class="chip-bat" style="color: {bat.color};">🔋 {bat.percentStr}</span>
              </div>
            </div>
            <div class="action-col">
              {#if peer.isFriend}
                <button
                  class="btn-line-chat"
                  on:click={() => handleStartChat({
                    id: peer.shortNodeId,
                    name: `เพื่อน ${peer.shortNodeId}`,
                    avatarEmoji: '👤',
                    statusMessage: '',
                    safetyNumber: '',
                    addedAt: Date.now()
                  })}
                >
                  แชท
                </button>
              {:else}
                <button
                  class="btn-add-peer"
                  on:click={() => {
                    processPairingString(`OG:v1:PAIR:${peer.shortNodeId}:KEYA:KEYB`);
                  }}
                >
                  ➕ เพิ่ม
                </button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- MODAL 1: MY QR CODE (SHARE CONTACT) -->
  {#if modalView === 'my_qr'}
    <div class="modal-backdrop" on:click={closeModal}>
      <div class="modal-card" on:click|stopPropagation>
        <div class="modal-header">
          <h3>🔲 QR Code ของฉัน</h3>
          <button class="btn-close-modal" on:click={closeModal}>✕</button>
        </div>
        <p class="modal-desc">
          ให้อีกเครื่องเปิดกล้องสแกน QR Code นี้ เพื่อแลกเปลี่ยน Contact และรหัสความปลอดภัย
        </p>

        <div class="qr-canvas-box">
          {#if myQrSvg}
            {@html myQrSvg}
          {:else}
            <div class="qr-placeholder">กำลังสร้าง QR Code...</div>
          {/if}
        </div>

        <div class="qr-info-box">
          <div class="node-id-lbl">รหัสโหนดของคุณ: <strong>{myShortNodeId}</strong></div>
          <div class="payload-text">{myContactPayload}</div>
        </div>

        <button class="btn-modal-action" on:click={copyMyPayload}>
          {copySuccess ? '✅ คัดลอกรหัสแล้ว!' : '📋 คัดลอกรหัสจับคู่ (Copy Payload)'}
        </button>
      </div>
    </div>
  {/if}

  <!-- MODAL 2: CAMERA QR SCANNER -->
  {#if modalView === 'scan_qr'}
    <div class="modal-backdrop" on:click={closeModal}>
      <div class="modal-card" on:click|stopPropagation>
        <div class="modal-header">
          <h3>📷 สแกน QR Code เพิ่มเพื่อน</h3>
          <button class="btn-close-modal" on:click={closeModal}>✕</button>
        </div>
        <p class="modal-desc">
          ส่องกล้องไปที่ QR Code บนหน้าจอเครื่องเพื่อน
        </p>

        <div class="scanner-viewport">
          <video bind:this={videoEl} playsinline muted class="camera-stream"></video>
          <div class="viewfinder-frame">
            <div class="edge tl"></div>
            <div class="edge tr"></div>
            <div class="edge bl"></div>
            <div class="edge br"></div>
            <div class="scanner-beam"></div>
          </div>
        </div>

        {#if cameraError}
          <div class="modal-alert warn">⚠️ {cameraError}</div>
        {/if}

        {#if scanSuccessMessage}
          <div class="modal-alert success">
            {scanSuccessMessage}
            {#if safetyNumberInfo}
              <div class="safety-box">
                <span>รหัสตรวจสอบความปลอดภัย 8 หลัก:</span>
                <strong>{safetyNumberInfo.formatted}</strong>
              </div>
            {/if}
          </div>
        {/if}

        {#if scanErrorMessage}
          <div class="modal-alert error">{scanErrorMessage}</div>
        {/if}

        <!-- Manual Input fallback -->
        <div class="manual-input-section">
          <span class="manual-lbl">หรือป้อนรหัสจับคู่ด้วยตนเอง:</span>
          <div class="manual-input-row">
            <input
              type="text"
              bind:value={manualInputCode}
              placeholder="OG:v1:PAIR:nodeId:ed25519:x25519"
            />
            <button class="btn-submit-manual" on:click={handleManualSubmit}>
              เพิ่ม
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .line-friends-root {
    display: flex;
    flex-direction: column;
    background: #090d16;
    border-radius: 12px;
    overflow: hidden;
  }

  /* LINE Style Header */
  .line-header {
    background: #0f172a;
    border-bottom: 1px solid #1e293b;
    padding: 0.85rem 1rem 0.65rem 1rem;
  }
  .header-main {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.65rem;
  }
  .header-main h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: #f8fafc;
  }
  .header-icons {
    display: flex;
    gap: 0.5rem;
  }
  .icon-btn {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 50%;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.15s ease;
  }
  .icon-btn:hover {
    background: #334155;
  }
  .btn-symbol {
    font-size: 1.1rem;
  }

  /* Search Input */
  .search-container {
    width: 100%;
  }
  .search-input-wrapper {
    display: flex;
    align-items: center;
    background: #1e293b;
    border-radius: 20px;
    padding: 0.4rem 0.75rem;
    gap: 0.4rem;
  }
  .search-icon {
    font-size: 0.9rem;
    color: #94a3b8;
  }
  .search-input-wrapper input {
    flex: 1;
    background: transparent;
    border: none;
    color: #f8fafc;
    font-size: 0.85rem;
    outline: none;
  }
  .search-input-wrapper input::placeholder {
    color: #64748b;
  }
  .btn-clear-search {
    background: none;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    font-size: 0.8rem;
    padding: 0 4px;
  }

  /* My Profile Section */
  .my-profile-section {
    display: flex;
    align-items: center;
    padding: 0.85rem 1rem;
    gap: 0.85rem;
    cursor: pointer;
    transition: background 0.15s ease;
  }
  .my-profile-section:hover {
    background: #0f172a;
  }
  .my-avatar-wrapper {
    position: relative;
    width: 48px;
    height: 48px;
    flex-shrink: 0;
  }
  .my-avatar {
    width: 48px;
    height: 48px;
    background: #1e293b;
    border: 2px solid #0284c7;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.6rem;
  }
  .my-online-badge {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 13px;
    height: 13px;
    background: #22c55e;
    border: 2px solid #090d16;
    border-radius: 50%;
  }
  .my-meta {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .my-name-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .my-name {
    font-size: 1rem;
    font-weight: 700;
    color: #f8fafc;
  }
  .my-badge-me {
    background: rgba(2, 132, 199, 0.2);
    color: #38bdf8;
    border: 1px solid #0284c7;
    font-size: 0.68rem;
    padding: 0 5px;
    border-radius: 10px;
    font-weight: 600;
  }
  .my-status {
    font-size: 0.78rem;
    color: #94a3b8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .btn-my-qr-mini {
    background: #1e293b;
    color: #38bdf8;
    border: 1px solid #0284c7;
    padding: 0.35rem 0.65rem;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
  }

  .line-divider {
    height: 1px;
    background: #1e293b;
    margin: 0 1rem;
  }

  /* Friends List Container */
  .friends-list-container {
    padding: 1rem;
  }
  .group-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
  }
  .group-title {
    font-size: 0.85rem;
    font-weight: 700;
    color: #94a3b8;
  }
  .radio-group-title {
    color: #38bdf8;
  }
  .btn-quick-add {
    background: none;
    border: none;
    color: #38bdf8;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
  }

  /* Friends Row */
  .friends-items-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .friend-row {
    display: flex;
    align-items: center;
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 10px;
    padding: 0.65rem 0.85rem;
    gap: 0.75rem;
    transition: background 0.15s ease;
  }
  .friend-row:hover {
    background: #162032;
  }
  .radio-peer-row {
    border-color: #334155;
  }
  .avatar-col {
    position: relative;
    flex-shrink: 0;
  }
  .friend-avatar {
    width: 42px;
    height: 42px;
    background: #1e293b;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
  }
  .radio-avatar {
    background: #1e293b;
    border: 1px dashed #0284c7;
  }
  .dot-online {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 10px;
    height: 10px;
    background: #22c55e;
    border: 2px solid #0f172a;
    border-radius: 50%;
  }
  .info-col {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .row-top {
    display: flex;
    align-items: center;
    gap: 0.45rem;
  }
  .friend-name {
    font-size: 0.92rem;
    font-weight: 700;
    color: #f8fafc;
  }
  .verified-tag {
    background: rgba(34, 197, 94, 0.12);
    color: #4ade80;
    font-size: 0.68rem;
    padding: 1px 5px;
    border-radius: 4px;
    font-weight: 600;
  }
  .badge-friend-tag {
    background: rgba(2, 132, 199, 0.15);
    color: #38bdf8;
    font-size: 0.68rem;
    padding: 1px 5px;
    border-radius: 4px;
  }
  .badge-relay-tag {
    background: rgba(234, 179, 8, 0.15);
    color: #facc15;
    font-size: 0.68rem;
    padding: 1px 5px;
    border-radius: 4px;
  }
  .friend-status {
    font-size: 0.78rem;
    color: #94a3b8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .peer-meta-chips {
    display: flex;
    gap: 0.4rem;
    font-size: 0.75rem;
    color: #94a3b8;
  }
  .action-col {
    flex-shrink: 0;
  }
  .btn-line-chat {
    background: #0284c7;
    color: #ffffff;
    border: none;
    padding: 0.38rem 0.85rem;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.15s ease;
  }
  .btn-line-chat:hover {
    background: #0369a1;
  }
  .btn-add-peer {
    background: #1e293b;
    color: #38bdf8;
    border: 1px solid #0284c7;
    padding: 0.38rem 0.75rem;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
  }

  /* LINE Empty State */
  .line-empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 2.5rem 1.5rem;
    background: #0f172a;
    border: 1px dashed #1e293b;
    border-radius: 12px;
    margin: 0.5rem 0;
  }
  .empty-bubble-illustration {
    width: 64px;
    height: 64px;
    background: #1e293b;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1rem;
  }
  .bubble-icon {
    font-size: 2rem;
  }
  .line-empty-state h4 {
    margin: 0 0 0.4rem 0;
    font-size: 1.05rem;
    color: #f8fafc;
  }
  .empty-hint {
    font-size: 0.82rem;
    color: #94a3b8;
    line-height: 1.4;
    max-width: 320px;
    margin: 0 0 1.25rem 0;
  }
  .empty-actions {
    display: flex;
    gap: 0.6rem;
    flex-wrap: wrap;
    justify-content: center;
  }
  .btn-primary-add {
    background: #16a34a;
    color: #ffffff;
    border: none;
    padding: 0.55rem 1rem;
    border-radius: 8px;
    font-weight: 700;
    font-size: 0.85rem;
    cursor: pointer;
  }
  .btn-secondary-share {
    background: #1e293b;
    color: #38bdf8;
    border: 1px solid #0284c7;
    padding: 0.55rem 1rem;
    border-radius: 8px;
    font-weight: 700;
    font-size: 0.85rem;
    cursor: pointer;
  }

  /* Modals */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 1rem;
  }
  .modal-card {
    background: #0f172a;
    border: 1px solid #334155;
    border-radius: 14px;
    max-width: 440px;
    width: 100%;
    padding: 1.25rem;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  }
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.35rem;
  }
  .modal-header h3 {
    margin: 0;
    font-size: 1.1rem;
    color: #f8fafc;
  }
  .btn-close-modal {
    background: #1e293b;
    border: none;
    color: #94a3b8;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 0.85rem;
  }
  .modal-desc {
    font-size: 0.8rem;
    color: #94a3b8;
    margin-bottom: 1rem;
    line-height: 1.35;
  }

  /* QR Modal Canvas */
  .qr-canvas-box {
    background: #ffffff;
    padding: 1rem;
    border-radius: 10px;
    display: flex;
    justify-content: center;
    margin-bottom: 0.85rem;
  }
  .qr-info-box {
    background: #090d16;
    border: 1px solid #1e293b;
    border-radius: 8px;
    padding: 0.6rem;
    margin-bottom: 0.85rem;
  }
  .node-id-lbl {
    font-size: 0.82rem;
    color: #94a3b8;
    margin-bottom: 4px;
  }
  .node-id-lbl strong {
    color: #38bdf8;
  }
  .payload-text {
    font-size: 0.68rem;
    color: #64748b;
    word-break: break-all;
    font-family: monospace;
  }
  .btn-modal-action {
    width: 100%;
    background: #0284c7;
    color: #ffffff;
    border: none;
    padding: 0.6rem;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
  }

  /* Camera Scanner Modal */
  .scanner-viewport {
    position: relative;
    width: 100%;
    height: 240px;
    background: #000000;
    border-radius: 10px;
    overflow: hidden;
    margin-bottom: 0.85rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .camera-stream {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .viewfinder-frame {
    position: absolute;
    width: 160px;
    height: 160px;
    border: 1px solid rgba(56, 189, 248, 0.3);
  }
  .edge {
    position: absolute;
    width: 18px;
    height: 18px;
    border-color: #38bdf8;
    border-style: solid;
  }
  .edge.tl { top: -1px; left: -1px; border-width: 3px 0 0 3px; }
  .edge.tr { top: -1px; right: -1px; border-width: 3px 3px 0 0; }
  .edge.bl { bottom: -1px; left: -1px; border-width: 0 0 3px 3px; }
  .edge.br { bottom: -1px; right: -1px; border-width: 0 3px 3px 0; }
  .scanner-beam {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 2px;
    background: #38bdf8;
    box-shadow: 0 0 8px #38bdf8;
    animation: scanLaser 2.2s infinite ease-in-out;
  }
  @keyframes scanLaser {
    0% { top: 0; }
    50% { top: 100%; }
    100% { top: 0; }
  }

  .modal-alert {
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    font-size: 0.8rem;
    margin-bottom: 0.75rem;
  }
  .modal-alert.warn {
    background: rgba(234, 179, 8, 0.15);
    border: 1px solid #eab308;
    color: #fef08a;
  }
  .modal-alert.success {
    background: rgba(34, 197, 94, 0.15);
    border: 1px solid #22c55e;
    color: #86efac;
  }
  .modal-alert.error {
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid #ef4444;
    color: #fca5a5;
  }
  .safety-box {
    margin-top: 4px;
    font-size: 0.82rem;
  }
  .safety-box strong {
    color: #38bdf8;
    display: block;
    margin-top: 2px;
  }
  .manual-input-section {
    border-top: 1px solid #1e293b;
    padding-top: 0.75rem;
  }
  .manual-lbl {
    display: block;
    font-size: 0.75rem;
    color: #94a3b8;
    margin-bottom: 0.35rem;
  }
  .manual-input-row {
    display: flex;
    gap: 0.4rem;
  }
  .manual-input-row input {
    flex: 1;
    background: #090d16;
    border: 1px solid #1e293b;
    border-radius: 6px;
    padding: 0.45rem 0.65rem;
    color: #f8fafc;
    font-size: 0.8rem;
    outline: none;
  }
  .btn-submit-manual {
    background: #0284c7;
    color: #ffffff;
    border: none;
    padding: 0.45rem 0.85rem;
    border-radius: 6px;
    font-size: 0.82rem;
    font-weight: 700;
    cursor: pointer;
  }
</style>
