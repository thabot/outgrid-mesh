<script lang="ts">
  /**
   * Offline Crisis Feed Svelte Component
   * Displays emergency alerts sorted by urgency with anti-spoof badge
   * Creator & Lead Architect: Thabot <thabo47@gmail.com>
   * Protocol: TOG v1.1 Emergency Feed UI
   * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
   */
  import { CrisisUrgency, type ICrisisFeedItem } from '../../core/feed/CrisisFeedManager';

  export let feedItems: ICrisisFeedItem[] = [];
</script>

<div class="crisis-feed-container">
  <div class="feed-header">
    <h3>📢 ศูนย์กระจายข่าวเตือนภัยฉุกเฉิน (Offline Feed)</h3>
  </div>

  {#if feedItems.length === 0}
    <div class="empty-feed">ยังไม่มีประกาศเตือนภัยในพื้นที่ขณะนี้</div>
  {:else}
    <div class="feed-list">
      {#each feedItems as item}
        <div class="feed-card" class:evacuate={item.urgency === CrisisUrgency.EVACUATE_IMMEDIATE}>
          <div class="badge-row">
            {#if item.urgency === CrisisUrgency.EVACUATE_IMMEDIATE}
              <span class="urgency-badge evacuate-badge">🚨 คำสั่งอพยพด่วนทันที</span>
            {:else if item.urgency === CrisisUrgency.WARNING}
              <span class="urgency-badge warning-badge">⚠️ คำเตือนภัย</span>
            {:else}
              <span class="urgency-badge info-badge">ℹ️ ข่าวสารทั่วไป</span>
            {/if}

            {#if item.isVerified}
              <span class="auth-badge verified">🛡️ ทางการยืนยันแล้ว ({item.senderAuthority})</span>
            {:else}
              <span class="auth-badge unverified">⚠️ ยังไม่ผ่านการยืนยันตัวตน</span>
            {/if}
          </div>

          <h4 class="title">{item.title}</h4>
          <p class="content">{item.content}</p>
          <div class="footer">
            <span class="time">{new Date(item.timestamp).toLocaleTimeString('th-TH')}</span>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .crisis-feed-container {
    padding: 16px;
    font-family: system-ui, -apple-system, sans-serif;
  }
  .feed-card {
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 14px;
    margin-bottom: 12px;
    background: #ffffff;
  }
  .feed-card.evacuate {
    border: 2px solid #ef4444;
    background: #fef2f2;
  }
  .badge-row {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
    font-size: 12px;
    font-weight: 600;
  }
  .evacuate-badge {
    background: #fee2e2;
    color: #b91c1c;
    padding: 2px 8px;
    border-radius: 6px;
  }
  .verified {
    background: #dcfce7;
    color: #15803d;
    padding: 2px 8px;
    border-radius: 6px;
  }
  .unverified {
    background: #fef3c7;
    color: #b45309;
    padding: 2px 8px;
    border-radius: 6px;
  }
</style>
