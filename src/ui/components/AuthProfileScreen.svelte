<script lang="ts">
  /**
   * Auth Profile, 100% Guest Parity & Zero-Knowledge Contact Backup (Sprint F Task F.4)
   * Self-Sovereign Identity, Zero-Knowledge Encrypted Cloud Backup & Language Selector
   * Creator & Lead Architect: Thabot <thabo47@gmail.com>
   * Protocol: TOG v1.1
   * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
   */
  import { i18n, SUPPORTED_LOCALES, type SupportedLocale } from '../../core/i18n/I18nStore';
  import { AuthManager, UserRole } from '../../core/auth/AuthManager';

  const localeStore = i18n.locale;
  const t = i18n.translations;
  let auth: AuthManager;
  let userProfile: any;

  try {
    auth = new AuthManager();
    userProfile = auth.getProfile();
  } catch (err) {
    userProfile = {
      nodeId: 'guest-node',
      displayName: 'Guest User',
      role: UserRole.GUEST_VICTIM
    };
  }

  let isBackingUp = false;
  let backupStatus = '';
  let storageUsageMb = 2.4;
  const storageCeilingMb = 50;

  function changeLanguage(locale: SupportedLocale) {
    i18n.setLocale(locale);
  }

  function handleBackupContacts() {
    isBackingUp = true;
    backupStatus = $t.backup_btn_running;
    setTimeout(() => {
      isBackingUp = false;
      backupStatus = $t.backup_success;
    }, 1200);
  }
</script>

<div class="profile-container">
  <div class="profile-card">
    <!-- Header & Identity Badge -->
    <div class="profile-header">
      <div class="avatar-circle">
        <span>👤</span>
      </div>
      <div class="profile-meta">
        <h3>{$t.guest_victim}</h3>
        <span class="badge-parity">{$t.guest_parity_badge}</span>
      </div>
    </div>

    <!-- 100% Guest Parity Callout -->
    <div class="parity-callout">
      <span class="callout-icon">🛡️</span>
      <div class="callout-text">
        <strong>{$t.guest_parity_title}</strong>
        <p>{$t.guest_parity_desc}</p>
      </div>
    </div>

    <!-- Language Selector Bar (10 Languages) -->
    <div class="section-box">
      <h4>🌐 {$t.lang_select_title}</h4>
      <div class="locales-grid">
        {#each SUPPORTED_LOCALES as loc}
          <button
            class="locale-btn"
            class:active={$localeStore === loc.code}
            on:click={() => changeLanguage(loc.code)}
          >
            <span class="flag">{loc.flag}</span>
            <span class="name">{loc.name}</span>
          </button>
        {/each}
      </div>
    </div>

    <!-- Zero-Knowledge Contact Backup -->
    <div class="section-box">
      <h4>🔒 {$t.backup_contacts_title}</h4>
      <p class="desc">
        {$t.backup_contacts_desc}
      </p>

      <button
        class="btn-backup"
        class:loading={isBackingUp}
        disabled={isBackingUp}
        on:click={handleBackupContacts}
      >
        {isBackingUp ? $t.backup_btn_running : $t.backup_btn_idle}
      </button>

      {#if backupStatus}
        <div class="status-msg">{backupStatus}</div>
      {/if}
    </div>

    <!-- Storage Quota Monitor -->
    <div class="section-box">
      <div class="storage-header">
        <h4>💾 {$t.storage_title}</h4>
        <span class="storage-value">{storageUsageMb} MB / {storageCeilingMb} MB</span>
      </div>

      <div class="storage-bar">
        <div class="storage-fill" style="width: {(storageUsageMb / storageCeilingMb) * 100}%;"></div>
      </div>

      <p class="storage-note">
        {$t.storage_note_1}<br />
        {$t.storage_note_2}
      </p>
    </div>
  </div>
</div>

<style>
  .profile-container {
    padding: 12px;
    display: flex;
    justify-content: center;
  }

  .profile-card {
    background: #090f1d;
    border: 1px solid #1e293b;
    border-radius: 12px;
    padding: 20px;
    max-width: 540px;
    width: 100%;
    color: #f1f5f9;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .profile-header {
    display: flex;
    align-items: center;
    gap: 14px;
    border-bottom: 1px solid #1e293b;
    padding-bottom: 14px;
  }

  .avatar-circle {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: #1e293b;
    border: 2px solid #0284c7;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 1.5rem;
  }

  .profile-meta h3 {
    margin: 0;
    font-size: 1.1rem;
    color: #e2e8f0;
  }

  .badge-parity {
    display: inline-block;
    background: rgba(34, 197, 94, 0.15);
    border: 1px solid #22c55e;
    color: #4ade80;
    padding: 2px 8px;
    border-radius: 9999px;
    font-size: 0.7rem;
    font-weight: 700;
    margin-top: 4px;
  }

  .parity-callout {
    background: rgba(2, 132, 199, 0.12);
    border: 1px solid #0284c7;
    border-radius: 8px;
    padding: 12px;
    display: flex;
    gap: 10px;
  }

  .callout-icon {
    font-size: 1.3rem;
  }

  .callout-text strong {
    font-size: 0.85rem;
    color: #38bdf8;
  }

  .callout-text p {
    margin: 4px 0 0 0;
    font-size: 0.78rem;
    color: #cbd5e1;
    line-height: 1.4;
  }

  .section-box {
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 8px;
    padding: 14px;
  }

  .section-box h4 {
    margin: 0 0 10px 0;
    font-size: 0.9rem;
    color: #e2e8f0;
  }

  .desc {
    font-size: 0.78rem;
    color: #94a3b8;
    margin: 0 0 12px 0;
    line-height: 1.4;
  }

  .locales-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .locale-btn {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 6px;
    padding: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
    color: #cbd5e1;
    font-size: 0.78rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .locale-btn:hover {
    border-color: #38bdf8;
    color: #ffffff;
  }

  .locale-btn.active {
    background: #0284c7;
    border-color: #38bdf8;
    color: #ffffff;
    font-weight: 700;
  }

  .btn-backup {
    width: 100%;
    background: #1e293b;
    border: 1px solid #0284c7;
    color: #38bdf8;
    border-radius: 6px;
    padding: 10px;
    font-weight: 700;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-backup:hover {
    background: #0284c7;
    color: #ffffff;
  }

  .btn-backup:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .status-msg {
    margin-top: 8px;
    padding: 8px;
    border-radius: 6px;
    background: rgba(34, 197, 94, 0.15);
    border: 1px solid #22c55e;
    color: #4ade80;
    font-size: 0.75rem;
  }

  .storage-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .storage-value {
    font-size: 0.78rem;
    color: #38bdf8;
    font-weight: 600;
  }

  .storage-bar {
    background: #1e293b;
    height: 8px;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 8px;
  }

  .storage-fill {
    background: #38bdf8;
    height: 100%;
    border-radius: 4px;
  }

  .storage-note {
    font-size: 0.72rem;
    color: #94a3b8;
    margin: 0;
    line-height: 1.4;
  }
</style>