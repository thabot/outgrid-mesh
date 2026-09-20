<script lang="ts">
  /**
   * Hamburger Drawer Menu Component (Sprint D Task D.2)
   * Top-Left ☰ Menu providing access to Survival Manual, Offline APK Share, Beacon Controls, Community Fund & System Info
   * Creator & Lead Architect: Thabot <thabo47@gmail.com>
   * Protocol: TOG v1.1
   * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
   */
  import { createEventDispatcher } from 'svelte';
  import HelpManualScreen from './HelpManualScreen.svelte';
  import DonationDashboard from './DonationDashboard.svelte';
  import BeaconControlsBar from './BeaconControlsBar.svelte';
  import ApkShareScreen from './ApkShareScreen.svelte';
  import AcousticBeaconPanel from './AcousticBeaconPanel.svelte';

  export let isOpen = false;
  export let appVersion = '1.1.0';
  export let commitSha = 'local';

  type DrawerSection = 'menu' | 'manual' | 'share_apk' | 'beacon' | 'fund' | 'system';
  let currentSection: DrawerSection = 'menu';

  const dispatch = createEventDispatcher<{
    close: void;
    openTab: { tab: string };
  }>();

  function closeDrawer() {
    isOpen = false;
    currentSection = 'menu';
    dispatch('close');
  }

  function handleShareApk() {
    if (typeof window !== 'undefined' && (window as any).AndroidBridge?.shareApkFile) {
      (window as any).AndroidBridge.shareApkFile();
    } else {
      alert('📲 โหมดแชร์ APK ออฟไลน์: รันบนอุปกรณ์ Android เพื่อส่งไฟล์ base.apk ตรงผ่าน Bluetooth / Quick Share หรือสร้าง Local Hotspot');
    }
  }
</script>

{#if isOpen}
  <div
    class="drawer-backdrop"
    role="dialog"
    aria-modal="true"
    aria-label="เมนูหลักและการตั้งค่า"
    tabindex="-1"
    on:click={closeDrawer}
    on:keydown={(e) => e.key === 'Escape' && closeDrawer()}
  >
    <div
      class="drawer-pane"
      role="document"
      tabindex="0"
      on:click|stopPropagation
      on:keydown|stopPropagation
    >
      <div class="drawer-header">
        <div class="drawer-brand">
          <img src="/logo.png" alt="OutGrid Logo" class="brand-img" />
          <div>
            <h3>OutGrid Mesh</h3>
            <span class="version-tag">TOG v{appVersion} ({commitSha})</span>
          </div>
        </div>
        <button class="btn-close" on:click={closeDrawer} aria-label="ปิดเมนู">✕</button>
      </div>

      {#if currentSection !== 'menu'}
        <div class="sub-nav-bar">
          <button class="back-btn" on:click={() => currentSection = 'menu'}>
            ← กลับสู่เมนูหลัก
          </button>
        </div>
      {/if}

      <div class="drawer-body">
        {#if currentSection === 'menu'}
          <nav class="drawer-menu-list">
            <button class="menu-entry" on:click={() => currentSection = 'manual'}>
              <span class="menu-icon">📖</span>
              <div class="menu-info">
                <strong>คู่มือเอาชีวิตรอด (10 ภาษา)</strong>
                <small>Field Survival Manual & First Aid Guide</small>
              </div>
            </button>

            <button class="menu-entry" on:click={() => currentSection = 'share_apk'}>
              <span class="menu-icon">📲</span>
              <div class="menu-info">
                <strong>แชร์ APK ออฟไลน์ (Sideload)</strong>
                <small>Quick Share, Bluetooth & Hotspot QR</small>
              </div>
            </button>

            <button class="menu-entry" on:click={() => currentSection = 'beacon'}>
              <span class="menu-icon">🔦</span>
              <div class="menu-info">
                <strong>แผงไฟฉาย & หวูดไซเรนฉุกเฉิน</strong>
                <small>Morse SOS Flashlight & 85dB Acoustic Siren</small>
              </div>
            </button>

            <button class="menu-entry" on:click={() => currentSection = 'fund'}>
              <span class="menu-icon">🤝</span>
              <div class="menu-info">
                <strong>กองทุนสนับสนุนชุมชน (Community Fund)</strong>
                <small>บัญชีโปร่งใส 100% ตรวจสอบได้แบบ Open Ledger</small>
              </div>
            </button>

            <button class="menu-entry" on:click={() => currentSection = 'system'}>
              <span class="menu-icon">⚙️</span>
              <div class="menu-info">
                <strong>ข้อมูลระบบ & สิทธิ์ฮาร์ดแวร์</strong>
                <small>System Diagnostic & Radio Drivers</small>
              </div>
            </button>
          </nav>
        {:else if currentSection === 'manual'}
          <div class="sub-content">
            <HelpManualScreen />
          </div>
        {:else if currentSection === 'share_apk'}
          <div class="sub-content">
            <ApkShareScreen />
          </div>
        {:else if currentSection === 'beacon'}
          <div class="sub-content">
            <BeaconControlsBar />
            <div style="margin-top: 14px;">
              <AcousticBeaconPanel />
            </div>
          </div>
        {:else if currentSection === 'fund'}
          <div class="sub-content">
            <DonationDashboard />
          </div>
        {:else if currentSection === 'system'}
          <div class="sub-content system-diag">
            <h4>⚙️ ข้อมูลระบบ & การเชื่อมต่อ</h4>
            <ul class="diag-list">
              <li><strong>Protocol:</strong> Thabot OutGrid Protocol (TOG v1.1)</li>
              <li><strong>PHY Driver:</strong> BLE Coded PHY S=8 (Range 300m - 5km)</li>
              <li><strong>Service:</strong> 24/7 Foreground Radio Service</li>
              <li><strong>Local Basemap:</strong> World Vector Basemap L2 (~5.4 MB Offline)</li>
              <li><strong>Creator:</strong> Thabot (&lt;thabo47@gmail.com&gt;)</li>
            </ul>
          </div>
        {/if}
      </div>

      <div class="drawer-footer">
        <p class="copyright">OutGrid Mesh • AGPL-3.0 Non-Profit Public Good</p>
      </div>
    </div>
  </div>
{/if}

<style>
  .drawer-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.75);
    z-index: 100;
    backdrop-filter: blur(4px);
    display: flex;
  }

  .drawer-pane {
    width: 85%;
    max-width: 360px;
    height: 100%;
    background: #090f1d;
    border-right: 1px solid #1e293b;
    display: flex;
    flex-direction: column;
    box-shadow: 4px 0 24px rgba(0, 0, 0, 0.6);
    animation: slide-in 0.25s ease-out;
  }

  @keyframes slide-in {
    from { transform: translateX(-100%); }
    to { transform: translateX(0); }
  }

  .drawer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid #1e293b;
    background: #0c1427;
  }

  .drawer-brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .brand-img {
    width: 38px;
    height: 38px;
    border-radius: 8px;
    border: 1px solid #0284c7;
  }

  .drawer-brand h3 {
    margin: 0;
    font-size: 1.05rem;
    color: #38bdf8;
  }

  .version-tag {
    font-size: 0.68rem;
    color: #94a3b8;
  }

  .btn-close {
    background: none;
    border: none;
    color: #94a3b8;
    font-size: 1.3rem;
    cursor: pointer;
  }

  .sub-nav-bar {
    padding: 8px 16px;
    background: #0f172a;
    border-bottom: 1px solid #1e293b;
  }

  .back-btn {
    background: none;
    border: none;
    color: #38bdf8;
    font-size: 0.85rem;
    cursor: pointer;
    font-weight: 600;
  }

  .drawer-body {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
  }

  .drawer-menu-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .menu-entry {
    display: flex;
    align-items: center;
    gap: 12px;
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 8px;
    padding: 12px;
    text-align: left;
    color: #f1f5f9;
    cursor: pointer;
    transition: all 0.2s;
  }

  .menu-entry:hover {
    background: #1e293b;
    border-color: #38bdf8;
  }

  .menu-icon {
    font-size: 1.5rem;
  }

  .menu-info {
    display: flex;
    flex-direction: column;
  }

  .menu-info strong {
    font-size: 0.88rem;
    color: #e2e8f0;
  }

  .menu-info small {
    font-size: 0.72rem;
    color: #94a3b8;
    margin-top: 2px;
  }

  .sub-content {
    color: #cbd5e1;
    font-size: 0.88rem;
  }

  .share-apk-view h4, .system-diag h4 {
    margin-top: 0;
    color: #38bdf8;
  }

  .btn-primary {
    width: 100%;
    background: #0284c7;
    color: #ffffff;
    border: none;
    border-radius: 8px;
    padding: 10px;
    font-weight: 700;
    font-size: 0.88rem;
    cursor: pointer;
    margin: 12px 0;
  }

  .apk-info-box {
    background: #1e293b;
    border-radius: 6px;
    padding: 10px;
    font-size: 0.78rem;
    color: #94a3b8;
  }

  .diag-list {
    list-style: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 0.82rem;
  }

  .drawer-footer {
    padding: 10px 16px;
    border-top: 1px solid #1e293b;
    background: #0c1427;
    text-align: center;
  }

  .copyright {
    font-size: 0.68rem;
    color: #64748b;
    margin: 0;
  }
</style>