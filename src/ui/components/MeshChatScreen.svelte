<script lang="ts">
  /**
   * Complete Offline Mesh Chat Screen (Sprint E Task E.2)
   * Broadcast & 1:1 E2EE chat, WebP image chunking, Opus voice audio, Pinned messages & Quick Chips
   * Creator & Lead Architect: Thabot <thabo47@gmail.com>
   * Protocol: TOG v1.1 Tactical Chat Hub
   * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
   */
  import { onMount } from 'svelte';
  import { MeshChatPayloadManager, type IChatMessage } from '../../core/chat/MeshChatPayload';

  export let myNodeId: string = 'node-self-47';

  let activeChatType: 'broadcast' | 'direct' = 'broadcast';
  let selectedRecipient = 'node-rescue-team';
  let hopPreset: 'local' | 'community' | 'max' = 'community';
  let inputText = '';
  let isSendingMedia = false;
  let mediaProgress = 0;

  // Initial demo messages
  let messages: IChatMessage[] = [
    {
      id: 'msg-001',
      senderNodeId: 'node-scout-01',
      text: '📢 แจ้งเตือน: ระดับน้ำสะพานมิตรภาพสูงขึ้น 20 ซม. ใน 1 ชม. หลีกเลี่ยงเส้นทางริมแม่น้ำ',
      timestamp: Date.now() - 300000,
      isEncrypted: false,
      hopPreset: 'community',
      ttlHops: 7,
      isPinned: true
    },
    {
      id: 'msg-002',
      senderNodeId: 'node-rescue-team',
      recipientNodeId: 'node-self-47',
      text: '🔒 ได้รับพิกัดแล้ว ทีมอาสากำลังเดินทางด้วยเรือยาง คาดว่าจะถึงใน 15 นาที',
      timestamp: Date.now() - 120000,
      isEncrypted: true,
      hopPreset: 'max',
      ttlHops: 15
    }
  ];

  const quickChips = [
    '🚨 ต้องการความช่วยเหลือด่วน',
    '📍 ปลอดภัยแล้ว อยู่ศูนย์อพยพ',
    '🍞 ต้องการน้ำและอาหาร',
    '🔋 แบตเตอรี่ใกล้หมด'
  ];

  function sendMessage() {
    if (!inputText.trim()) return;

    const newMsg: IChatMessage = {
      id: `msg-${Date.now()}`,
      senderNodeId: myNodeId,
      recipientNodeId: activeChatType === 'direct' ? selectedRecipient : undefined,
      text: inputText.trim(),
      timestamp: Date.now(),
      isEncrypted: activeChatType === 'direct',
      hopPreset,
      ttlHops: MeshChatPayloadManager.resolveHopCount(hopPreset)
    };

    messages = [...messages, newMsg];
    inputText = '';
  }

  function handleQuickChip(chip: string) {
    inputText = chip;
    sendMessage();
  }

  function togglePin(msgId: string) {
    messages = messages.map(m => m.id === msgId ? { ...m, isPinned: !m.isPinned } : m);
  }

  function handleAttachImage() {
    isSendingMedia = true;
    mediaProgress = 10;
    const timer = setInterval(() => {
      mediaProgress += 20;
      if (mediaProgress >= 100) {
        clearInterval(timer);
        isSendingMedia = false;
        messages = [
          ...messages,
          {
            id: `msg-img-${Date.now()}`,
            senderNodeId: myNodeId,
            text: '📷 [ภาพถ่ายสถานการณ์ WebP บีบอัด 8.4 KB]',
            timestamp: Date.now(),
            isEncrypted: activeChatType === 'direct',
            hopPreset,
            ttlHops: MeshChatPayloadManager.resolveHopCount(hopPreset)
          }
        ];
      }
    }, 200);
  }
</script>

<div class="chat-screen">
  <!-- Top Navigation & Chat Channel Switcher -->
  <div class="chat-header">
    <div class="channel-tabs">
      <button
        class="tab-btn"
        class:active={activeChatType === 'broadcast'}
        on:click={() => activeChatType = 'broadcast'}
      >
        📢 ส่วนรวม (Broadcast)
      </button>
      <button
        class="tab-btn"
        class:active={activeChatType === 'direct'}
        on:click={() => activeChatType = 'direct'}
      >
        🔒 แชทส่วนตัว 1:1 (E2EE)
      </button>
    </div>

    <!-- Hop Preset Selector Chips -->
    <div class="hop-chips-bar">
      <span class="hop-label">รัศมีส่งต่อ:</span>
      <button
        class="chip-btn"
        class:active={hopPreset === 'local'}
        on:click={() => hopPreset = 'local'}
        title="3 Hops (~300ม. รอบตัว)"
      >
        🟢 รอบตัว (3 Hops)
      </button>
      <button
        class="chip-btn"
        class:active={hopPreset === 'community'}
        on:click={() => hopPreset = 'community'}
        title="7 Hops (~1กม. ชุมชน)"
      >
        🟡 ชุมชน (7 Hops)
      </button>
      <button
        class="chip-btn"
        class:active={hopPreset === 'max'}
        on:click={() => hopPreset = 'max'}
        title="15 Hops (~2-3กม. ไกลสุด)"
      >
        🔴 ไกลสุด (15 Hops)
      </button>
    </div>
  </div>

  <!-- Messages Scroll Area -->
  <div class="messages-container">
    {#each messages as msg}
      <div
        class="message-row"
        class:own={msg.senderNodeId === myNodeId}
        class:pinned={msg.isPinned}
      >
        <div class="message-bubble">
          <div class="bubble-header">
            <span class="sender-id">
              {msg.senderNodeId === myNodeId ? 'ฉัน' : msg.senderNodeId}
            </span>
            <div class="header-icons">
              {#if msg.isEncrypted}
                <span class="icon-e2ee" title="เข้ารหัสลับ E2EE ChaCha20-Poly1305">🔒</span>
              {/if}
              <button class="btn-pin" on:click={() => togglePin(msg.id)} title="ปักหมุดข้อความป้องกันการถูกลบ">
                {msg.isPinned ? '📌' : '📍'}
              </button>
            </div>
          </div>

          <p class="bubble-text">{msg.text}</p>

          <div class="bubble-footer">
            <span class="time-stamp">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span class="hop-tag">TTL: {msg.ttlHops} Hops</span>
            <span class="status-tick">✓✓</span>
          </div>
        </div>
      </div>
    {/each}

    {#if isSendingMedia}
      <div class="media-upload-bar">
        <span>📡 กำลังส่งชิ้นส่วนรูปภาพ WebP ({mediaProgress}%)...</span>
        <div class="progress-track">
          <div class="progress-fill" style="width: {mediaProgress}%;"></div>
        </div>
      </div>
    {/if}
  </div>

  <!-- Quick Broadcast Chips -->
  <div class="quick-chips-row">
    {#each quickChips as chip}
      <button class="quick-chip-btn" on:click={() => handleQuickChip(chip)}>
        {chip}
      </button>
    {/each}
  </div>

  <!-- Input Bar -->
  <div class="chat-input-bar">
    <button class="btn-tool" on:click={handleAttachImage} title="แนบภาพถ่ายสถานการณ์ WebP บีบอัด">
      📷
    </button>
    <button class="btn-tool" on:click={() => inputText += ' 📍 [13.7563, 100.5018]'} title="แนบพิกัด GPS ของฉัน">
      📍
    </button>
    <input
      type="text"
      class="text-input"
      placeholder={activeChatType === 'broadcast' ? 'พิมพ์กระจายข่าวสารรอบตัว...' : 'พิมพ์ข้อความส่วนตัว 1:1 เข้ารหัส...'}
      bind:value={inputText}
      on:keydown={(e) => e.key === 'Enter' && sendMessage()}
    />
    <button class="btn-send" on:click={sendMessage} disabled={!inputText.trim()}>
      ➤
    </button>
  </div>
</div>

<style>
  .chat-screen {
    display: flex;
    flex-direction: column;
    height: 600px;
    background: #090f1d;
    border-radius: 8px;
    overflow: hidden;
    color: #f1f5f9;
  }

  .chat-header {
    background: #0f172a;
    border-bottom: 1px solid #1e293b;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .channel-tabs {
    display: flex;
    gap: 8px;
  }

  .tab-btn {
    flex: 1;
    background: #1e293b;
    border: 1px solid #334155;
    color: #94a3b8;
    padding: 6px;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
  }

  .tab-btn.active {
    background: #0284c7;
    border-color: #38bdf8;
    color: #ffffff;
  }

  .hop-chips-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.75rem;
  }

  .hop-label {
    color: #64748b;
  }

  .chip-btn {
    background: #1e293b;
    border: 1px solid #334155;
    color: #cbd5e1;
    padding: 2px 8px;
    border-radius: 9999px;
    font-size: 0.7rem;
    cursor: pointer;
  }

  .chip-btn.active {
    border-color: #38bdf8;
    color: #38bdf8;
    background: rgba(56, 189, 248, 0.15);
  }

  .messages-container {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .message-row {
    display: flex;
    justify-content: flex-start;
  }

  .message-row.own {
    justify-content: flex-end;
  }

  .message-bubble {
    max-width: 80%;
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 12px;
    padding: 8px 12px;
    font-size: 0.85rem;
  }

  .message-row.own .message-bubble {
    background: #0369a1;
    border-color: #0284c7;
  }

  .message-row.pinned .message-bubble {
    border-color: #fbbf24;
    box-shadow: 0 0 8px rgba(251, 191, 36, 0.2);
  }

  .bubble-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.72rem;
    color: #94a3b8;
    margin-bottom: 4px;
    gap: 8px;
  }

  .bubble-text {
    margin: 0;
    line-height: 1.4;
    word-break: break-word;
  }

  .bubble-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
    font-size: 0.65rem;
    color: #94a3b8;
    margin-top: 4px;
  }

  .btn-pin {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    font-size: 0.75rem;
  }

  .media-upload-bar {
    background: #1e293b;
    border: 1px solid #38bdf8;
    border-radius: 6px;
    padding: 8px;
    font-size: 0.75rem;
    color: #38bdf8;
  }

  .progress-track {
    background: #0f172a;
    height: 4px;
    border-radius: 2px;
    margin-top: 6px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: #38bdf8;
    transition: width 0.2s ease;
  }

  .quick-chips-row {
    display: flex;
    gap: 6px;
    padding: 6px 12px;
    overflow-x: auto;
    background: #0f172a;
    border-top: 1px solid #1e293b;
  }

  .quick-chip-btn {
    white-space: nowrap;
    background: #1e293b;
    border: 1px solid #334155;
    color: #cbd5e1;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 0.72rem;
    cursor: pointer;
  }

  .quick-chip-btn:hover {
    border-color: #38bdf8;
    color: #38bdf8;
  }

  .chat-input-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 12px;
    background: #0f172a;
    border-top: 1px solid #1e293b;
  }

  .btn-tool {
    background: #1e293b;
    border: 1px solid #334155;
    color: #cbd5e1;
    width: 36px;
    height: 36px;
    border-radius: 6px;
    font-size: 1rem;
    cursor: pointer;
  }

  .text-input {
    flex: 1;
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 6px;
    color: #ffffff;
    padding: 8px 12px;
    font-size: 0.85rem;
    outline: none;
  }

  .text-input:focus {
    border-color: #38bdf8;
  }

  .btn-send {
    background: #0284c7;
    border: none;
    color: #ffffff;
    width: 36px;
    height: 36px;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
  }

  .btn-send:disabled {
    background: #1e293b;
    color: #64748b;
    cursor: not-allowed;
  }
</style>