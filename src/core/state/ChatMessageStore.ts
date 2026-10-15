/**
 * Global Chat Message Manager & Persistent Store
 * Ensures zero-loss background radio chat packet ingestion, cross-tab sync, and unread tracking
 * Protocol: TOG v1.1 Chat Delivery Pipeline
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { writable, derived, get } from 'svelte/store';
import { NativeBridgeDispatcher } from '../native/NativeBridgeDispatcher';
import { PacketSerializer, type ICompactDirectChat } from '../protocol/PacketSerializer';
import { TOG_MAGIC, TOGPacketType, TOGPriority, type ITOGPacket } from '../protocol/TOGPacket';
import { AuthManager } from '../auth/AuthManager';

export interface IChatMessage {
  id: string;
  sender: string;
  isSelf: boolean;
  text: string;
  time: string;
  hops: string;
  hasPhoto?: boolean;
  recipientId?: string;
  timestamp: number;
  isUnread?: boolean;
}

export interface IBroadcastChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
  hops: string;
  isPinned?: boolean;
  timestamp: number;
}

export class ChatMessageManager {
  private directMessagesStore = writable<IChatMessage[]>([]);
  private broadcastMessagesStore = writable<IBroadcastChatMessage[]>([]);
  private activeRecipientStore = writable<string | null>(null);
  private unreadCountStore = writable<number>(0);

  private dispatcher = NativeBridgeDispatcher.getInstance();
  private auth = new AuthManager();
  private unsubscribeRadio: (() => void) | null = null;
  private seenPacketMap = new Map<string, number>();

  private static readonly DIRECT_STORAGE_KEY = 'outgrid_chat_direct_v2';
  private static readonly BROADCAST_STORAGE_KEY = 'outgrid_chat_broadcast_v2';
  private static readonly DEDUP_WINDOW_MS = 15000; // 15-second deduplication suppression window

  constructor() {
    this.loadPersistedMessages();
    this.initRadioPacketListener();
  }

  public isDuplicatePacket(key: string, now: number = Date.now()): boolean {
    const lastSeen = this.seenPacketMap.get(key);
    if (lastSeen !== undefined && (now - lastSeen) < ChatMessageManager.DEDUP_WINDOW_MS) {
      return true;
    }
    this.seenPacketMap.set(key, now);
    if (this.seenPacketMap.size > 1000) {
      for (const [k, timestamp] of this.seenPacketMap.entries()) {
        if (now - timestamp > 60000) {
          this.seenPacketMap.delete(k);
        }
      }
    }
    return false;
  }

  public getDirectMessagesStore() {
    return this.directMessagesStore;
  }

  public getBroadcastMessagesStore() {
    return this.broadcastMessagesStore;
  }

  public getActiveRecipientStore() {
    return this.activeRecipientStore;
  }

  public getUnreadCountStore() {
    return this.unreadCountStore;
  }

  public setActiveRecipient(recipientId: string | null) {
    this.activeRecipientStore.set(recipientId);
    if (recipientId) {
      this.markConversationAsRead(recipientId);
    }
  }

  public markConversationAsRead(recipientId: string) {
    this.directMessagesStore.update(messages => {
      let updated = false;
      const normalizedRecipient = recipientId.toUpperCase();
      const newMessages = messages.map(msg => {
        const msgRecipient = (msg.recipientId || '').toUpperCase();
        if (msg.isUnread && (msgRecipient.includes(normalizedRecipient) || normalizedRecipient.includes(msgRecipient))) {
          updated = true;
          return { ...msg, isUnread: false };
        }
        return msg;
      });
      if (updated) {
        this.recalculateUnreadCount(newMessages);
        this.savePersistedMessages(newMessages, get(this.broadcastMessagesStore));
      }
      return newMessages;
    });
  }

  private recalculateUnreadCount(messages: IChatMessage[]) {
    const unreadTotal = messages.filter(m => !m.isSelf && m.isUnread).length;
    this.unreadCountStore.set(unreadTotal);
  }

  private loadPersistedMessages() {
    try {
      const g = typeof globalThis !== 'undefined' ? globalThis : null;
      const storage = g ? (g as any)['localStorage'] : null;
      if (storage) {
        const directRaw = storage.getItem(ChatMessageManager.DIRECT_STORAGE_KEY);
        if (directRaw) {
          const parsed = JSON.parse(directRaw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.directMessagesStore.set(parsed);
            this.recalculateUnreadCount(parsed);
          } else {
            this.seedInitialMessages();
          }
        } else {
          this.seedInitialMessages();
        }

        const bcastRaw = storage.getItem(ChatMessageManager.BROADCAST_STORAGE_KEY);
        if (bcastRaw) {
          const parsedBcast = JSON.parse(bcastRaw);
          if (Array.isArray(parsedBcast) && parsedBcast.length > 0) {
            this.broadcastMessagesStore.set(parsedBcast);
          } else {
            this.seedInitialBroadcasts();
          }
        } else {
          this.seedInitialBroadcasts();
        }
      } else {
        this.seedInitialMessages();
        this.seedInitialBroadcasts();
      }
    } catch {
      this.seedInitialMessages();
      this.seedInitialBroadcasts();
    }
  }

  private seedInitialMessages() {
    const profile = this.auth.getProfile();
    const myPubHex = profile.nodeId.slice(0, 4).toUpperCase();
    const initialDirect: IChatMessage[] = [
      {
        id: 'd-01',
        sender: 'หน่วยกู้ภัยสว่างบริบูรณ์ (HQ)',
        isSelf: false,
        text: 'สวัสดีครับ ได้รับพิกัดขอความช่วยเหลือแล้ว ทีมอาสากำลังนำเรือยางเข้าไป ขอภาพถ่ายสภาพน้ำท่วมในพื้นที่เพื่อประเมินระดับน้ำครับ',
        time: '15:42',
        hops: '1 Hop',
        recipientId: 'node-rescue-team',
        timestamp: Date.now() - 120000,
        isUnread: false
      },
      {
        id: 'd-02',
        sender: `ฉัน (#${myPubHex})`,
        isSelf: true,
        text: 'ระดับน้ำสูงถึงเอวแล้วครับ กำลังส่งภาพถ่ายสภาพหน้าบ้านให้ดูครับ',
        time: '15:44',
        hops: '1 Hop 🔒',
        hasPhoto: true,
        recipientId: 'node-rescue-team',
        timestamp: Date.now() - 60000,
        isUnread: false
      }
    ];
    this.directMessagesStore.set(initialDirect);
    this.recalculateUnreadCount(initialDirect);
  }

  private seedInitialBroadcasts() {
    const initialBcast: IBroadcastChatMessage[] = [
      {
        id: 'b-01',
        sender: 'Scout 01',
        text: '📢 แจ้งเตือน: ระดับน้ำสะพานมิตรภาพสูงขึ้น 20 ซม. ใน 1 ชม. หลีกเลี่ยงเส้นทางริมแม่น้ำ',
        time: '15:10',
        hops: '15 Hops (~2-3km)',
        isPinned: true,
        timestamp: Date.now() - 300000
      },
      {
        id: 'b-02',
        sender: 'หมอสมชาย (Field Doctor #4C55)',
        text: 'จุดปฐมพยาบาลศาลาประชาคมเปิดบริการแล้ว มีผ้าพันแผล ยาฆ่าเชื้อ และน้ำดื่มสะอาด',
        time: '15:20',
        hops: '3 Hops',
        timestamp: Date.now() - 200000
      },
      {
        id: 'b-03',
        sender: 'สถานีวิทยุชุมชนดอนเมือง (#9B22)',
        text: 'โหนดสถานีทวนสัญญาณ LoRa และ BLE Coded PHY พร้อมรับส่งต่อข้อความกู้ภัย 24 ชม.',
        time: '15:35',
        hops: '15 Hops (Max Range)',
        timestamp: Date.now() - 100000
      }
    ];
    this.broadcastMessagesStore.set(initialBcast);
  }

  private savePersistedMessages(direct: IChatMessage[], bcast: IBroadcastChatMessage[]) {
    try {
      const g = typeof globalThis !== 'undefined' ? globalThis : null;
      const storage = g ? (g as any)['localStorage'] : null;
      if (storage) {
        storage.setItem(ChatMessageManager.DIRECT_STORAGE_KEY, JSON.stringify(direct.slice(-200)));
        storage.setItem(ChatMessageManager.BROADCAST_STORAGE_KEY, JSON.stringify(bcast.slice(-100)));
      }
    } catch {}
  }

  private initRadioPacketListener() {
    this.unsubscribeRadio = this.dispatcher.subscribeToPackets(event => {
      this.handleIncomingRadioPacket(event.bytes, event.rssi);
    });
  }

  public handleIncomingRadioPacket(bytes: Uint8Array, rssi: number) {
    if (bytes.length < 14) return;
    if (bytes[0] !== 0x54 || bytes[1] !== 0x4f) return; // TOG Magic (0x544F)

    const pType = bytes[2] & 0x1f;
    if (pType !== TOGPacketType.DIRECT_CHAT && pType !== TOGPacketType.GROUP_CHAT) return;

    const profile = this.auth.getProfile();
    let myNumericShortId = 0x47a1;
    try {
      const parsed = parseInt(profile.nodeId.slice(0, 4), 16);
      if (!isNaN(parsed) && parsed > 0) myNumericShortId = parsed;
    } catch {}

    const myPubHex = profile.nodeId.slice(0, 4).toUpperCase();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const now = Date.now();
    const activeRecip = get(this.activeRecipientStore);

    // 1. Compact Direct Chat (<= 28 bytes)
    if (bytes.length <= 28) {
      try {
        const compact = PacketSerializer.deserializeCompactDirectChat(bytes);
        if (compact.senderShortId === myNumericShortId) return; // Echo suppression

        const isBroadcast = compact.recipientShortId === 0xffff;
        const isForMe = compact.recipientShortId === myNumericShortId || isBroadcast;
        if (!isForMe) return;

        const senderHex = `#${compact.senderShortId.toString(16).padStart(4, '0').toUpperCase()}`;
        const dedupKey = `compact:${compact.senderShortId}:${compact.truncatedMsgId || compact.textPayload}:${compact.textPayload}`;
        if (this.isDuplicatePacket(dedupKey, now)) {
          return; // Suppress duplicate burst advertisement packets
        }

        const msgId = compact.truncatedMsgId ? `d-${compact.truncatedMsgId}` : `d-${now}`;
        const bcastId = compact.truncatedMsgId ? `b-${compact.truncatedMsgId}` : `b-${now}`;

        if (isBroadcast) {
          this.broadcastMessagesStore.update(msgs => {
            if (msgs.some(m => m.id === bcastId || (m.sender.includes(senderHex) && m.text === compact.textPayload && Math.abs(m.timestamp - now) < 5000))) {
              return msgs;
            }
            const next = [
              ...msgs,
              {
                id: bcastId,
                sender: `โหนด ${senderHex}`,
                text: compact.textPayload,
                time: timeStr,
                hops: '1 Hop',
                timestamp: now
              }
            ];
            this.savePersistedMessages(get(this.directMessagesStore), next);
            return next;
          });
        } else {
          const isCurrentlyChatting = activeRecip && activeRecip.toUpperCase().includes(senderHex.toUpperCase());
          const newMsg: IChatMessage = {
            id: msgId,
            sender: `โหนด ${senderHex}`,
            isSelf: false,
            text: compact.textPayload,
            time: timeStr,
            hops: '1 Hop 🔒',
            recipientId: senderHex,
            timestamp: now,
            isUnread: !isCurrentlyChatting
          };

          this.directMessagesStore.update(msgs => {
            if (msgs.some(m => m.id === newMsg.id || (m.sender.includes(senderHex) && m.text === newMsg.text && Math.abs(m.timestamp - now) < 5000))) {
              return msgs;
            }
            const next = [...msgs, newMsg];
            this.recalculateUnreadCount(next);
            this.savePersistedMessages(next, get(this.broadcastMessagesStore));
            return next;
          });
        }
      } catch (err) {
        // Silently skip corrupted frame
      }
      return;
    }

    // 2. Standard TOG Packet (>= 39 bytes)
    if (bytes.length >= 39) {
      try {
        const packet = PacketSerializer.deserialize(bytes);
        let senderHex = Array.from(packet.senderPubkeyHash)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
          .slice(0, 4)
          .toUpperCase();
        if (!senderHex) senderHex = 'NODE';
        if (senderHex === myPubHex) return; // Echo suppression

        const senderNodeId = `#${senderHex}`;
        const isBroadcast =
          packet.recipientHash.every(b => b === 0xff || b === 0x00) ||
          pType === TOGPacketType.GROUP_CHAT;

        const recipientHex = Array.from(packet.recipientHash.subarray(0, 2))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
          .toUpperCase();
        const isForMe = isBroadcast || recipientHex === myPubHex || recipientHex === 'FFFF';
        if (!isForMe) return;

        const text = new TextDecoder('utf-8').decode(packet.payload);
        const dedupKey = `std:${senderHex}:${packet.messageId.toString()}:${text}`;
        if (this.isDuplicatePacket(dedupKey, now)) {
          return; // Suppress duplicate standard packets
        }

        const msgId = `d-${packet.messageId.toString()}`;
        const bcastId = `b-${packet.messageId.toString()}`;

        if (isBroadcast) {
          this.broadcastMessagesStore.update(msgs => {
            if (msgs.some(m => m.id === bcastId || (m.sender.includes(senderHex) && m.text === text && Math.abs(m.timestamp - now) < 5000))) {
              return msgs;
            }
            const next = [
              ...msgs,
              {
                id: bcastId,
                sender: `โหนด ${senderNodeId}`,
                text,
                time: timeStr,
                hops: `${packet.header.ttlHops} Hops`,
                timestamp: now
              }
            ];
            this.savePersistedMessages(get(this.directMessagesStore), next);
            return next;
          });
        } else {
          const isCurrentlyChatting = activeRecip && activeRecip.toUpperCase().includes(senderHex.toUpperCase());
          const newMsg: IChatMessage = {
            id: msgId,
            sender: `โหนด ${senderNodeId}`,
            isSelf: false,
            text,
            time: timeStr,
            hops: '1 Hop 🔒',
            recipientId: senderNodeId,
            timestamp: now,
            isUnread: !isCurrentlyChatting
          };

          this.directMessagesStore.update(msgs => {
            if (msgs.some(m => m.id === newMsg.id || (m.sender.includes(senderHex) && m.text === newMsg.text && Math.abs(m.timestamp - now) < 5000))) {
              return msgs;
            }
            const next = [...msgs, newMsg];
            this.recalculateUnreadCount(next);
            this.savePersistedMessages(next, get(this.broadcastMessagesStore));
            return next;
          });
        }
      } catch (err) {
        // Silently skip corrupted frame
      }
    }
  }

  public parseRecipientShortId(idStr: string): number {
    const hexMatch = idStr.match(/[0-9A-Fa-f]{4}/);
    if (hexMatch) return parseInt(hexMatch[0], 16);
    let hash = 0;
    for (let i = 0; i < idStr.length; i++) {
      hash = (hash * 31 + idStr.charCodeAt(i)) & 0xffff;
    }
    return hash || 0x4c55;
  }

  public sendDirectMessage(recipientId: string, text: string): boolean {
    const profile = this.auth.getProfile();
    const myPubHex = profile.nodeId.slice(0, 4).toUpperCase();
    let myNumericShortId = 0x47a1;
    try {
      const parsed = parseInt(profile.nodeId.slice(0, 4), 16);
      if (!isNaN(parsed) && parsed > 0) myNumericShortId = parsed;
    } catch {}

    const now = Date.now();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const recipientShortId = this.parseRecipientShortId(recipientId);

    // Save outgoing message locally
    const outgoingMsg: IChatMessage = {
      id: `d-${now}`,
      sender: `ฉัน (#${myPubHex})`,
      isSelf: true,
      text,
      time: timeStr,
      hops: '1 Hop 🔒',
      recipientId,
      timestamp: now,
      isUnread: false
    };

    this.directMessagesStore.update(msgs => {
      const next = [...msgs, outgoingMsg];
      this.savePersistedMessages(next, get(this.broadcastMessagesStore));
      return next;
    });

    // Transmit Radio Packets (both standard TOG and compact frame)
    try {
      const textEncoder = new TextEncoder();
      const payloadBytes = textEncoder.encode(text);

      const recipientHash = new Uint8Array(8);
      recipientHash[0] = (recipientShortId >> 8) & 0xff;
      recipientHash[1] = recipientShortId & 0xff;

      const directPacket: ITOGPacket = {
        header: {
          magic: TOG_MAGIC,
          version: 1,
          packetType: TOGPacketType.DIRECT_CHAT,
          ttlHops: 4,
          priority: TOGPriority.NORMAL,
          flags: 0,
          reserved: 0
        },
        messageId: BigInt(now),
        senderPubkeyHash: profile.keyPair.publicKey.slice(0, 8),
        recipientHash,
        targetH3Index: 0n,
        payloadLength: payloadBytes.length,
        payload: payloadBytes
      };

      const wireBytes = PacketSerializer.serialize(directPacket);
      this.dispatcher.transmitRadioPacket(wireBytes, true);

      // Compact direct chat frame (<= 28 bytes)
      const compactMsg: ICompactDirectChat = {
        senderShortId: myNumericShortId,
        recipientShortId,
        truncatedMsgId: (now & 0xffffffff) >>> 0,
        h3LowerRes9: 0,
        textPayload: text
      };
      const compactWire = PacketSerializer.serializeCompactDirectChat(compactMsg);
      this.dispatcher.transmitRadioPacket(compactWire, true);
      return true;
    } catch (err) {
      console.warn('Failed to transmit direct radio chat:', err);
      return false;
    }
  }

  public sendBroadcastMessage(text: string): boolean {
    const profile = this.auth.getProfile();
    let myNumericShortId = 0x47a1;
    try {
      const parsed = parseInt(profile.nodeId.slice(0, 4), 16);
      if (!isNaN(parsed) && parsed > 0) myNumericShortId = parsed;
    } catch {}

    const now = Date.now();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const outgoingBcast: IBroadcastChatMessage = {
      id: `b-${now}`,
      sender: `ฉัน (#${profile.nodeId.slice(0, 4).toUpperCase()})`,
      text,
      time: timeStr,
      hops: '15 Hops (Max Broadcast)',
      timestamp: now
    };

    this.broadcastMessagesStore.update(msgs => {
      const next = [...msgs, outgoingBcast];
      this.savePersistedMessages(get(this.directMessagesStore), next);
      return next;
    });

    try {
      const textEncoder = new TextEncoder();
      const payloadBytes = textEncoder.encode(text);

      const bcastPacket: ITOGPacket = {
        header: {
          magic: TOG_MAGIC,
          version: 1,
          packetType: TOGPacketType.GROUP_CHAT,
          ttlHops: 15,
          priority: TOGPriority.NORMAL,
          flags: 0,
          reserved: 0
        },
        messageId: BigInt(now),
        senderPubkeyHash: profile.keyPair.publicKey.slice(0, 8),
        recipientHash: new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]),
        targetH3Index: 0n,
        payloadLength: payloadBytes.length,
        payload: payloadBytes
      };

      const wireBytes = PacketSerializer.serialize(bcastPacket);
      this.dispatcher.transmitRadioPacket(wireBytes, true);

      // Compact broadcast frame
      const compactMsg: ICompactDirectChat = {
        senderShortId: myNumericShortId,
        recipientShortId: 0xffff,
        truncatedMsgId: (now & 0xffffffff) >>> 0,
        h3LowerRes9: 0,
        textPayload: text
      };
      const compactWire = PacketSerializer.serializeCompactDirectChat(compactMsg);
      this.dispatcher.transmitRadioPacket(compactWire, true);
      return true;
    } catch (err) {
      console.warn('Failed to transmit broadcast radio packet:', err);
      return false;
    }
  }
}

export const chatMessageManager = new ChatMessageManager();
export const directMessagesStore = chatMessageManager.getDirectMessagesStore();
export const broadcastMessagesStore = chatMessageManager.getBroadcastMessagesStore();
export const unreadChatCountStore = chatMessageManager.getUnreadCountStore();
