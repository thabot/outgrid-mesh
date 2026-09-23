<script lang="ts">
  /**
   * Complete Offline Mesh Chat Screen (Mockup UI Alignment)
   * Contacts/Friends List + Public Broadcast + 1:1 Direct E2EE Chat + QR Modals + WebP Media
   * Creator & Lead Architect: Thabot <thabo47@gmail.com>
   * Protocol: TOG v1.1 Tactical Chat Hub
   * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
   */
  import { onMount } from 'svelte';
  import { MeshChatPayloadManager, type IChatMessage } from '../../core/chat/MeshChatPayload';
  import { i18n } from '../../core/i18n/I18nStore';

  export let myNodeId: string = 'node-self-47';
  export let targetContact: { peerId: string; peerName: string } | null = null;

  const translations = i18n.translations;

  let currentView: 'contacts' | 'broadcast' | 'direct' = 'contacts';
  let selectedRecipient = 'node-rescue-team';
  let selectedRecipientName = 'หน่วยกู้ภัยสว่างบริบูรณ์ (Rescue Team)';
  let selectedRecipientAvatar = '🚑';
  let contactSearchQuery = '';
  let inputText = '';
  let broadcastInputText = '';

  // Modals state
  let showMyQrModal = false;
  let showScanQrModal = false;

  interface IContactPeer {
    id: string;
    name: string;
    avatar: string;
    status: string;
    lastMessage: string;
    lastTime: string;
    unreadCount: number;
    isOnline: boolean;
  }

  let contacts: IContactPeer[] = [
    {
      id: 'node-rescue-team',
      name: 'หน่วยกู้ภัยสว่างบริบูรณ์ (Rescue Team)',
      avatar: '🚑',
      status: 'ทีมแพทย์และเรือกู้ภัย',
      lastMessage: '🔒 ได้รับพิกัดแล้ว ทีมอาสากำลังเดินทางด้วยเรือยาง...',
      lastTime: '15:42',
      unreadCount: 1,
      isOnline: true
    },
    {
      id: 'node-medic-04',
      name: 'หมอสมชาย (Field Doctor #4C55)',
      avatar: '🩺',
      status: 'จุดปฐมพยาบาลโซนเหนือ',
      lastMessage: 'มียาลดไข้และน้ำเกลือสำรองเพียงพอ พร้อมรับผู้ป่วย',
      lastTime: '14:55',
      unreadCount: 0,
      isOnline: true
    },
    {
      id: 'node-scout-01',
      name: 'อาสาสมัครลาดตระเวน (Scout 01)',
      avatar: '🦺',
      status: 'ลาดตระเวนเส้นทางแม่น้ำ',
      lastMessage: 'จุดอพยพวัดสะพานพร้อมรับผู้ประสบภัย',
      lastTime: '13:10',
      unreadCount: 0,
      isOnline: true
    }
  ];

  let broadcastMessages: Array<{
    id: string;
    sender: string;
    text: string;
    time: string;
    hops: string;
    isPinned?: boolean;
  }> = [
    {
      id: 'b-01',
      sender: 'Scout 01',
      text: '📢 แจ้งเตือน: ระดับน้ำสะพานมิตรภาพสูงขึ้น 20 ซม. ใน 1 ชม. หลีกเลี่ยงเส้นทางริมแม่น้ำ',
      time: '15:10',
      hops: '15 Hops (~2-3km)',
      isPinned: true
    },
    {
      id: 'b-02',
      sender: 'หมอสมชาย (Field Doctor #4C55)',
      text: 'จุดปฐมพยาบาลศาลาประชาคมเปิดบริการแล้ว มีผ้าพันแผล ยาฆ่าเชื้อ และน้ำดื่มสะอาด',
      time: '15:20',
      hops: '3 Hops'
    },
    {
      id: 'b-03',
      sender: 'สถานีวิทยุชุมชนดอนเมือง (#9B22)',
      text: 'โหนดสถานีทวนสัญญาณ LoRa และ BLE Coded PHY พร้อมรับส่งต่อข้อความกู้ภัย 24 ชม.',
      time: '15:35',
      hops: '15 Hops (Max Range)'
    }
  ];

  let directMessages: Array<{
    id: string;
    sender: string;
    isSelf: boolean;
    text: string;
    time: string;
    hops: string;
    hasPhoto?: boolean;
  }> = [
    {
      id: 'd-01',
      sender: 'หน่วยกู้ภัยสว่างบริบูรณ์',
      isSelf: false,
      text: 'สวัสดีครับ ได้รับพิกัดขอความช่วยเหลือแล้ว ทีมอาสากำลังนำเรือยางเข้าไป ขอภาพถ่ายสภาพน้ำท่วมในพื้นที่เพื่อประเมินระดับน้ำครับ',
      time: '15:42',
      hops: '1 Hop'
    },
    {
      id: 'd-02',
      sender: 'ฉัน (#47A1)',
      isSelf: true,
      text: 'ระดับน้ำสูงถึงเอวแล้วครับ กำลังส่งภาพถ่ายสภาพหน้าบ้านให้ดูครับ',
      time: '15:44',
      hops: '1 Hop 🔒',
      hasPhoto: true
    }
  ];

  // Reactively open direct chat if targetContact is set
  $: if (targetContact && targetContact.peerId) {
    selectedRecipient = targetContact.peerId;
    selectedRecipientName = targetContact.peerName || targetContact.peerId;
    const found = contacts.find(c => c.id === targetContact?.peerId);
    selectedRecipientAvatar = found ? found.avatar : '🧑‍🚀';
    currentView = 'direct';
  }

  $: filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
    c.id.toLowerCase().includes(contactSearchQuery.toLowerCase())
  );

  function openDirectChat(contact: IContactPeer) {
    selectedRecipient = contact.id;
    selectedRecipientName = contact.name;
    selectedRecipientAvatar = contact.avatar;
    contact.unreadCount = 0;
    currentView = 'direct';
  }

  function sendBroadcastMessage() {
    if (!broadcastInputText.trim()) return;
    broadcastMessages = [
      ...broadcastMessages,
      {
        id: `b-${Date.now()}`,
        sender: 'ฉัน (#47A1)',
        text: broadcastInputText.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        hops: '15 Hops'
      }
    ];
    broadcastInputText = '';
  }

  function sendDirectMessage() {
    if (!inputText.trim()) return;
    directMessages = [
      ...directMessages,
      {
        id: `d-${Date.now()}`,
        sender: 'ฉัน (#47A1)',
        isSelf: true,
        text: inputText.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        hops: '1 Hop 🔒'
      }
    ];

    const c = contacts.find(item => item.id === selectedRecipient);
    if (c) {
      c.lastMessage = `🔒 ${inputText.trim()}`;
      c.lastTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      contacts = [...contacts];
    }
    inputText = '';
  }

  function sendQuickBroadcast(text: string) {
    broadcastInputText = text;
    sendBroadcastMessage();
  }

  function handlePhotoUpload(event: Event) {
    alert('📷 บีบอัดรูปภาพด้วย WebP (ขนาด < 15KB) และแบ่งชิ้นส่วน 16 Shards ส่งผ่านคลื่นวิทยุ BLE เรียบร้อยแล้ว!');
  }
</script>

<div class="chat-container">
  <!-- Subview A: Contacts List View -->
  {#if currentView === 'contacts'}
    <div class="chat-contact-list-view">
      <div class="chat-nav-header">
        <div class="chat-subtabs">
          <button class="btn-chat-subtab active" on:click={() => currentView = 'contacts'}>👥 เพื่อน & รายชื่อ</button>
          <button class="btn-chat-subtab" on:click={() => currentView = 'broadcast'}>📢 ประกาศสาธารณะ</button>
        </div>
        <div class="qr-actions-row">
          <button class="btn-qr-action" on:click={() => showMyQrModal = true}>
            <span>📱</span> <span>QR ของฉัน</span>
          </button>
          <button class="btn-qr-action btn-scan" on:click={() => showScanQrModal = true}>
            <span>📷</span> <span>สแกน QR</span>
          </button>
        </div>
      </div>

      <input
        type="text"
        class="search-input-box"
        placeholder="🔍 ค้นหารายชื่อเพื่อน หรือ Node ID (#4C55)..."
        bind:value={contactSearchQuery}
      />

      <div class="contact-list">
        {#each filteredContacts as contact}
          <div class="contact-item" on:click={() => openDirectChat(contact)} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && openDirectChat(contact)}>
            <div class="contact-avatar">
              {contact.avatar}
              <span class="avatar-online-dot"></span>
            </div>
            <div class="contact-info">
              <div class="contact-name-row">
                <span class="contact-name">{contact.name}</span>
                <span class="contact-time">{contact.lastTime}</span>
              </div>
              <div class="contact-last-msg">{contact.lastMessage}</div>
            </div>
            {#if contact.unreadCount > 0}
              <span class="unread-badge">{contact.unreadCount}</span>
            {/if}
          </div>
        {/each}
      </div>
    </div>

  <!-- Subview B: Public Broadcast View -->
  {:else if currentView === 'broadcast'}
    <div class="broadcast-chat-view">
      <div class="chat-nav-header">
        <div class="chat-subtabs">
          <button class="btn-chat-subtab" on:click={() => currentView = 'contacts'}>👥 เพื่อน & รายชื่อ</button>
          <button class="btn-chat-subtab active" on:click={() => currentView = 'broadcast'}>📢 ประกาศสาธารณะ</button>
        </div>
        <div class="broadcast-status-badge">
          <span class="badge-tag">📡 สาธารณะรอบตัว</span>
          <span class="badge-saved">💾 บันทึกในเครื่อง</span>
        </div>
      </div>

      <!-- Quick Chips Row -->
      <div class="quick-chips-row">
        <button class="quick-chip" on:click={() => sendQuickBroadcast('🚨 ต้องการความช่วยเหลือด่วน')}>🚨 ต้องการความช่วยเหลือด่วน</button>
        <button class="quick-chip" on:click={() => sendQuickBroadcast('📍 ปลอดภัยแล้ว อยู่ศูนย์อพยพ')}>📍 ปลอดภัยแล้ว</button>
        <button class="quick-chip" on:click={() => sendQuickBroadcast('🍞 ต้องการน้ำและอาหาร')}>🍞 ขอน้ำ/อาหาร</button>
        <button class="quick-chip" on:click={() => sendQuickBroadcast('🔋 แบตเตอรี่ใกล้หมด')}>🔋 แบตใกล้หมด</button>
      </div>

      <!-- Broadcast Messages Scroll -->
      <div class="chat-messages-scroll">
        {#each broadcastMessages as msg}
          {#if msg.isPinned}
            <div class="bubble-pinned">
              <div class="pinned-header">
                <span class="pinned-title">📌 ปักหมุดเตือนภัยชุมชน ({msg.sender}):</span>
                <span class="pinned-range">{msg.hops}</span>
              </div>
              <p class="pinned-text">{msg.text}</p>
            </div>
          {:else}
            <div class="bubble bubble-in">
              <span class="bubble-sender">{msg.sender}:</span>
              <p>{msg.text}</p>
              <span class="bubble-time">{msg.time} • {msg.hops}</span>
            </div>
          {/if}
        {/each}
      </div>

      <!-- Broadcast Input Bar -->
      <div class="chat-input-bar">
        <label class="btn-media-action" title="ส่งรูปภาพสถานการณ์ผ่านวิทยุ Mesh">
          📷
          <input type="file" accept="image/*" style="display: none;" on:change={handlePhotoUpload} />
        </label>
        <button class="btn-media-action" title="บันทึกเสียงสั้น Opus Voice Memo" on:click={() => alert('🎙️ เริ่มบันทึกเสียง Voice Memo (Opus 8kbps) สำหรับ Broadcast')}>
          🎙️
        </button>
        <input
          type="text"
          class="chat-input-field"
          placeholder="พิมพ์ข้อความประกาศสาธารณะ (Broadcast)..."
          bind:value={broadcastInputText}
          on:keydown={(e) => e.key === 'Enter' && sendBroadcastMessage()}
        />
        <button class="btn-send-msg" on:click={sendBroadcastMessage}>ส่ง</button>
      </div>
    </div>

  <!-- Subview C: 1:1 Direct E2EE Chat View -->
  {:else if currentView === 'direct'}
    <div class="direct-chat-view">
      <div class="direct-chat-header">
        <button class="btn-back-chat" on:click={() => currentView = 'contacts'}>← กลับรายชื่อเพื่อน</button>
        <div class="direct-chat-title-group">
          <div class="direct-user-meta">
            <span class="active-avatar">{selectedRecipientAvatar}</span>
            <div>
              <span class="active-name">{selectedRecipientName}</span>
              <span class="active-sec">● BLE Coded PHY (E2EE 🔒)</span>
            </div>
          </div>
          <span class="badge-saved">💾 บันทึกในเครื่อง</span>
        </div>
      </div>

      <!-- Direct Message History -->
      <div class="chat-messages-scroll">
        {#each directMessages as msg}
          <div class="bubble {msg.isSelf ? 'bubble-out' : 'bubble-in'}">
            <span class="bubble-sender">{msg.sender}:</span>
            <p>{msg.text}</p>
            {#if msg.hasPhoto}
              <div class="photo-preview-card">
                <div class="photo-placeholder">
                  <span style="font-size: 24px;">🌊</span>
                  <span style="font-size: 10px; font-weight: bold;">flood_frontdoor.webp (12.4 KB)</span>
                </div>
                <div class="photo-footer">
                  <span class="photo-badge">📷 WebP Chunked [16/16 Shards]</span>
                  <span>100% ส่งสำเร็จ 🔒</span>
                </div>
              </div>
            {/if}
            <span class="bubble-time">{msg.time} ({msg.hops})</span>
          </div>
        {/each}
      </div>

      <!-- Direct Chat Input Bar -->
      <div class="chat-input-bar">
        <label class="btn-media-action" title="เลือกรูปภาพเพื่อบีบอัดเป็น WebP">
          📷
          <input type="file" accept="image/*" style="display: none;" on:change={handlePhotoUpload} />
        </label>
        <button class="btn-media-action" title="บันทึกเสียง Opus Voice Memo" on:click={() => alert('🎙️ เริ่มบันทึกเสียงสั้น (Opus Audio Memo 8kbps) เพื่อส่งผ่านวิทยุ Mesh')}>
          🎙️
        </button>
        <input
          type="text"
          class="chat-input-field"
          placeholder="พิมพ์ข้อความ 1:1 เข้ารหัส E2EE..."
          bind:value={inputText}
          on:keydown={(e) => e.key === 'Enter' && sendDirectMessage()}
        />
        <button class="btn-send-msg" on:click={sendDirectMessage}>ส่ง</button>
      </div>
    </div>
  {/if}
</div>

<!-- Modal 1: My QR Code -->
{#if showMyQrModal}
  <div class="modal-overlay" on:click={() => showMyQrModal = false}>
    <div class="modal-card modal-qr" on:click|stopPropagation>
      <div class="modal-header">
        <span style="font-weight: 800; color: #38bdf8;">📱 QR Code ของฉัน (#47A1)</span>
        <button class="btn-close-modal" on:click={() => showMyQrModal = false}>✕</button>
      </div>
      <p style="font-size: 11px; color: #94a3b8; margin-bottom: 12px; text-align: center;">
        ให้เพื่อนใช้ OutGrid Mesh สแกนรูปนี้เพื่อจับคู่แบบออฟไลน์ 100%
      </p>
      <div class="qr-container">
        <div class="qr-box">
          <span class="qr-label">#47A1 QR</span>
        </div>
      </div>
      <p style="font-size: 11px; color: #34d399; font-weight: bold; text-align: center;">
        🔒 Public Key Hash: 0x47A1B29F
      </p>
    </div>
  </div>
{/if}

<!-- Modal 2: Scan Friend's QR Code -->
{#if showScanQrModal}
  <div class="modal-overlay" on:click={() => showScanQrModal = false}>
    <div class="modal-card modal-qr" on:click|stopPropagation>
      <div class="modal-header">
        <span style="font-weight: 800; color: #38bdf8;">📷 สแกน QR Code เพื่อเพิ่มเพื่อน</span>
        <button class="btn-close-modal" on:click={() => showScanQrModal = false}>✕</button>
      </div>
      <div class="camera-preview-box">
        <span style="font-size: 32px;">📷</span>
        <span style="font-size: 11px; color: #38bdf8; margin-top: 6px;">กำลังเปิดกล้องสแกน...</span>
        <span style="font-size: 9px; color: #64748b;">(จับคู่คีย์ Curve25519 ทันทีเมื่อกล้องเห็น QR)</span>
      </div>
      <button class="btn-modal-action" on:click={() => { alert('จำลองการสแกนสำเร็จ: เพิ่มเพื่อน หมอสมชาย (#4C55) เรียบร้อยแล้ว!'); showScanQrModal = false; }}>
        ✅ จำลองการสแกนสำเร็จ
      </button>
    </div>
  </div>
{/if}

<style>
  .chat-container {
    height: 560px;
    display: flex;
    flex-direction: column;
    background: #0f172a;
    border-radius: 0.75rem;
    overflow: hidden;
  }
  .chat-contact-list-view, .broadcast-chat-view, .direct-chat-view {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .chat-nav-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: #0b1120;
    border-bottom: 1px solid #1e293b;
    gap: 8px;
    flex-wrap: wrap;
  }
  .chat-subtabs {
    display: flex;
    gap: 4px;
  }
  .btn-chat-subtab {
    background: #1e293b;
    border: 1px solid #334155;
    color: #94a3b8;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
  }
  .btn-chat-subtab.active {
    background: #0284c7;
    color: #ffffff;
    border-color: #38bdf8;
  }
  .qr-actions-row {
    display: flex;
    gap: 6px;
  }
  .btn-qr-action {
    background: #1e293b;
    border: 1px solid #334155;
    color: #38bdf8;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .btn-qr-action.btn-scan {
    background: #0284c7;
    color: #ffffff;
    border-color: #0284c7;
  }
  .search-input-box {
    margin: 8px 12px;
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 6px;
    padding: 6px 10px;
    color: #f1f5f9;
    font-size: 11px;
    outline: none;
  }
  .contact-list {
    flex: 1;
    overflow-y: auto;
    padding: 0 12px 12px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .contact-item {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 8px;
    padding: 8px 10px;
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    transition: background 0.15s;
  }
  .contact-item:hover {
    background: #334155;
    border-color: #38bdf8;
  }
  .contact-avatar {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: #0f172a;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    position: relative;
    border: 1px solid #334155;
  }
  .avatar-online-dot {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #22c55e;
    border: 2px solid #0f172a;
  }
  .contact-info {
    flex: 1;
    min-width: 0;
  }
  .contact-name-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2px;
  }
  .contact-name {
    font-size: 12px;
    font-weight: 700;
    color: #f8fafc;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .contact-time {
    font-size: 10px;
    color: #64748b;
  }
  .contact-last-msg {
    font-size: 11px;
    color: #94a3b8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .unread-badge {
    background: #ef4444;
    color: #fff;
    font-size: 10px;
    font-weight: 800;
    padding: 1px 6px;
    border-radius: 10px;
  }

  /* Quick Chips */
  .quick-chips-row {
    display: flex;
    gap: 6px;
    padding: 6px 12px;
    overflow-x: auto;
    background: #0b1120;
    scrollbar-width: none;
  }
  .quick-chips-row::-webkit-scrollbar {
    display: none;
  }
  .quick-chip {
    background: #1e293b;
    color: #cbd5e1;
    border: 1px solid #334155;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 600;
    white-space: nowrap;
    cursor: pointer;
  }
  .quick-chip:hover {
    background: #0284c7;
    color: #fff;
    border-color: #38bdf8;
  }

  /* Messages Scroll */
  .chat-messages-scroll {
    flex: 1;
    padding: 12px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .bubble {
    max-width: 80%;
    padding: 8px 12px;
    border-radius: 10px;
    font-size: 12px;
    line-height: 1.5;
  }
  .bubble-in {
    background: #1e293b;
    color: #f1f5f9;
    align-self: flex-start;
    border: 1px solid #334155;
  }
  .bubble-out {
    background: #0284c7;
    color: #ffffff;
    align-self: flex-end;
  }
  .bubble-sender {
    font-size: 10px;
    font-weight: bold;
    color: #38bdf8;
    display: block;
    margin-bottom: 2px;
  }
  .bubble-out .bubble-sender {
    color: #e0f2fe;
  }
  .bubble-time {
    font-size: 9px;
    color: #94a3b8;
    display: block;
    text-align: right;
    margin-top: 3px;
  }
  .bubble-out .bubble-time {
    color: #e0f2fe;
  }
  .bubble-pinned {
    border: 1px solid #f59e0b;
    background: rgba(120, 53, 15, 0.35);
    border-radius: 8px;
    padding: 8px 12px;
    margin-bottom: 4px;
  }
  .pinned-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2px;
  }
  .pinned-title {
    font-size: 10px;
    font-weight: 800;
    color: #f59e0b;
  }
  .pinned-range {
    font-size: 9px;
    color: #94a3b8;
  }
  .pinned-text {
    font-size: 11px;
    color: #fef3c7;
  }

  /* Chat Input Bar */
  .chat-input-bar {
    padding: 8px 10px;
    border-top: 1px solid #1e293b;
    display: flex;
    align-items: center;
    gap: 6px;
    background: #0b1120;
  }
  .btn-media-action {
    background: #1e293b;
    border: 1px solid #334155;
    color: #38bdf8;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
    cursor: pointer;
    flex-shrink: 0;
  }
  .chat-input-field {
    flex: 1;
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 8px;
    padding: 7px 12px;
    color: #f1f5f9;
    font-size: 12px;
    outline: none;
  }
  .btn-send-msg {
    background: #0284c7;
    color: #fff;
    border: none;
    padding: 7px 14px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    flex-shrink: 0;
  }

  /* Direct Chat Header */
  .direct-chat-header {
    padding: 8px 12px;
    border-bottom: 1px solid #1e293b;
    display: flex;
    align-items: center;
    gap: 10px;
    background: #0b1120;
  }
  .btn-back-chat {
    background: #1e293b;
    border: 1px solid #334155;
    color: #38bdf8;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
  }
  .direct-chat-title-group {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .direct-user-meta {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .active-avatar {
    font-size: 20px;
  }
  .active-name {
    font-size: 12px;
    font-weight: 800;
    color: #38bdf8;
    display: block;
  }
  .active-sec {
    display: block;
    font-size: 9px;
    color: #22c55e;
  }
  .badge-saved {
    background: rgba(6, 78, 59, 0.7);
    color: #34d399;
    font-size: 9px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid #059669;
  }
  .badge-tag {
    font-size: 10px;
    color: #34d399;
    font-weight: 700;
  }
  .broadcast-status-badge {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  /* Photo Preview Card */
  .photo-preview-card {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 6px;
    padding: 4px;
    margin-top: 4px;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
  .photo-placeholder {
    width: 100%;
    height: 90px;
    background: linear-gradient(135deg, #0369a1, #0f172a);
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #e0f2fe;
  }
  .photo-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 4px;
    font-size: 9px;
    color: #e0f2fe;
  }
  .photo-badge {
    font-size: 9px;
    background: rgba(0, 0, 0, 0.6);
    padding: 1px 4px;
    border-radius: 3px;
    display: inline-block;
  }

  /* Modals */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 16px;
    backdrop-filter: blur(4px);
  }
  .modal-card {
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 12px;
    max-width: 400px;
    width: 100%;
    padding: 16px;
    color: #f1f5f9;
  }
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #1e293b;
    padding-bottom: 8px;
    margin-bottom: 12px;
    font-size: 13px;
  }
  .btn-close-modal {
    background: transparent;
    border: none;
    color: #94a3b8;
    font-size: 16px;
    cursor: pointer;
  }
  .qr-container {
    background: #fff;
    padding: 16px;
    border-radius: 10px;
    display: flex;
    justify-content: center;
    margin: 0 auto 12px auto;
    width: fit-content;
    border: 2px solid #38bdf8;
  }
  .qr-box {
    width: 160px;
    height: 160px;
    background: repeating-linear-gradient(45deg, #000, #000 10px, #fff 10px, #fff 20px);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .qr-label {
    background: #fff;
    color: #000;
    padding: 4px 8px;
    font-weight: 900;
    font-size: 12px;
    border: 2px solid #000;
  }
  .camera-preview-box {
    width: 100%;
    height: 180px;
    background: #000;
    border-radius: 8px;
    border: 2px dashed #38bdf8;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin-bottom: 12px;
  }
  .btn-modal-action {
    width: 100%;
    background: #0284c7;
    color: #fff;
    border: none;
    padding: 8px;
    border-radius: 6px;
    font-weight: 800;
    font-size: 12px;
    cursor: pointer;
  }
</style>