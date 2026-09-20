<script lang="ts">
  /**
   * Offline APK Sideload & Wi-Fi Hotspot Sharing Screen (Sprint F Task F.2)
   * Quick Share / Bluetooth Intent & Local Embedded Hotspot QR
   * Creator & Lead Architect: Thabot <thabo47@gmail.com>
   * Protocol: TOG v1.1 Offline APK Distribution
   * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
   */
  import { OfflineQrGenerator } from '../../core/crypto/OfflineQrGenerator';

  export let hotspotSsid: string = 'OutGrid-Rescue';
  export let hotspotPsk: string = '12345678';
  export let hostIp: string = '192.168.49.1';

  let isHotspotActive = false;
  let isInverted = true;

  $: qrPayload = OfflineQrGenerator.createApkHotspotPayload(hotspotSsid, hotspotPsk, hostIp);
  $: qrSvg = OfflineQrGenerator.renderSvg(qrPayload, { inverted: isInverted, pixelSize: 9 });

  function handleNativeShare() {
    if (typeof window !== 'undefined' && (window as any).AndroidBridge?.shareApkFile) {
      (window as any).AndroidBridge.shareApkFile();
    } else {
      alert('📲 Quick Share: กำลังดึงไฟล์ base.apk จากเครื่องเพื่อส่งผ่าน Bluetooth หรือ Quick Share');
    }
  }

  function toggleHotspot() {
    isHotspotActive = !isHotspotActive;
    if (typeof window !== 'undefined' && (window as any).AndroidBridge) {
      if (isHotspotActive) {
        (window as any).AndroidBridge.startApkHotspot();
      } else {
        (window as any).AndroidBridge.stopApkHotspot();
      }
    }
  }
</script>

<div class="apk-share-container">
  <div class="share-card">
    <div class="card-header">
      <span class="share-icon">📲</span>
      <div>
        <h3>แชร์ไฟล์ติดตั้ง OutGrid Mesh ออฟไลน์ 100%</h3>
        <p class="subtitle">แจกไฟล์ APK ติดตั้งให้คนข้างเคียงโดยไม่ต้องต่อเน็ต ไม่ต้องผ่าน Store</p>
      </div>
    </div>

    <!-- Method 1: Android Native Quick Share -->
    <div class="action-block">
      <h4>วิธีที่ 1: ส่งตรงผ่าน Quick Share / Bluetooth</h4>
      <p class="method-desc">ส่งไฟล์ base.apk ตรงจากเครื่องคุณ ยิงเข้ามือถือเพื่อนได้ทันที</p>
      <button class="btn-share-native" on:click={handleNativeShare}>
        📤 เปิดหน้าต่างแชร์ของ Android (Quick Share)
      </button>
    </div>

    <div class="divider"><span>หรือ</span></div>

    <!-- Method 2: Local Wi-Fi Hotspot & QR Sideload -->
    <div class="action-block">
      <div class="block-header">
        <h4>วิธีที่ 2: เปิด Hotspot วงปิด + สแกน QR โหลด APK</h4>
        <button
          class="btn-toggle-hotspot"
          class:active={isHotspotActive}
          on:click={toggleHotspot}
        >
          {isHotspotActive ? '🛑 ปิด Hotspot' : '⚡ เปิดวง Hotspot'}
        </button>
      </div>

      <p class="method-desc">
        มือถือของคุณจะปล่อย Wi-Fi ชั่วคราว ให้เพื่อนใช้กล้องสแกน QR Code นี้เพื่อต่อ Wi-Fi และโหลดไฟล์ APK ติดตั้งได้ทันที
      </p>

      <div class="qr-preview-wrapper">
        <div class="qr-box">
          {@html qrSvg}
        </div>
        <div class="qr-tools">
          <button class="btn-tool" on:click={() => isInverted = !isInverted}>
            {isInverted ? '☀️ โหมดกลางวัน' : '🌙 โหมดกลางคืน (AMOLED)'}
          </button>
          <span class="qr-badge">ความทนทานสูงสุด Level H (30% Error Resilience)</span>
        </div>
      </div>

      <div class="hotspot-info-box">
        <div class="info-row">
          <span>Wi-Fi SSID:</span>
          <strong>{hotspotSsid}</strong>
        </div>
        <div class="info-row">
          <span>รหัสผ่าน (Password):</span>
          <strong>{hotspotPsk}</strong>
        </div>
        <div class="info-row">
          <span>ลิงก์ดาวน์โหลด:</span>
          <strong>http://{hostIp}:8080/app.apk</strong>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .apk-share-container {
    padding: 12px;
    display: flex;
    justify-content: center;
  }

  .share-card {
    background: #090f1d;
    border: 1px solid #1e293b;
    border-radius: 12px;
    padding: 20px;
    max-width: 520px;
    width: 100%;
    color: #f1f5f9;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
    border-bottom: 1px solid #1e293b;
    padding-bottom: 14px;
  }

  .share-icon {
    font-size: 2.2rem;
  }

  .card-header h3 {
    margin: 0;
    color: #38bdf8;
    font-size: 1.15rem;
  }

  .subtitle {
    margin: 4px 0 0 0;
    font-size: 0.78rem;
    color: #94a3b8;
  }

  .action-block {
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 8px;
    padding: 14px;
  }

  .action-block h4 {
    margin: 0 0 6px 0;
    color: #e2e8f0;
    font-size: 0.92rem;
  }

  .method-desc {
    font-size: 0.78rem;
    color: #94a3b8;
    margin: 0 0 12px 0;
    line-height: 1.4;
  }

  .btn-share-native {
    width: 100%;
    background: #0284c7;
    color: #ffffff;
    border: none;
    border-radius: 6px;
    padding: 10px;
    font-weight: 700;
    font-size: 0.85rem;
    cursor: pointer;
    transition: background 0.2s;
  }

  .btn-share-native:hover {
    background: #0369a1;
  }

  .divider {
    display: flex;
    align-items: center;
    text-align: center;
    margin: 14px 0;
    color: #64748b;
    font-size: 0.75rem;
  }

  .divider::before, .divider::after {
    content: '';
    flex: 1;
    border-bottom: 1px solid #1e293b;
  }

  .divider span {
    padding: 0 10px;
  }

  .block-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }

  .btn-toggle-hotspot {
    background: #1e293b;
    border: 1px solid #334155;
    color: #38bdf8;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 0.75rem;
    cursor: pointer;
    font-weight: 600;
  }

  .btn-toggle-hotspot.active {
    background: #ef4444;
    border-color: #ef4444;
    color: #ffffff;
  }

  .qr-preview-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 14px 0;
    gap: 8px;
  }

  .qr-box {
    background: #000000;
    padding: 12px;
    border-radius: 10px;
    border: 2px solid #0284c7;
    display: flex;
    justify-content: center;
    align-items: center;
    box-shadow: 0 0 16px rgba(2, 132, 199, 0.25);
  }

  .qr-tools {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .btn-tool {
    background: none;
    border: 1px solid #334155;
    color: #94a3b8;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 0.72rem;
    cursor: pointer;
  }

  .qr-badge {
    font-size: 0.68rem;
    color: #4ade80;
  }

  .hotspot-info-box {
    background: #1e293b;
    border-radius: 6px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 0.78rem;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
  }

  .info-row span {
    color: #94a3b8;
  }

  .info-row strong {
    color: #38bdf8;
  }
</style>