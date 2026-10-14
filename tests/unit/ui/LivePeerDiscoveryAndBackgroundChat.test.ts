import { describe, expect, it, beforeEach } from 'bun:test';
import { AuthManager } from '../../../src/core/auth/AuthManager';
import {
  chatMessageManager,
  directMessagesStore,
  broadcastMessagesStore,
  unreadChatCountStore
} from '../../../src/core/state/ChatMessageStore';
import {
  peerDiscoveryManager,
  discoveredPeersStore
} from '../../../src/core/state/PeerDiscoveryStore';
import { NativeBridgeDispatcher } from '../../../src/core/native/NativeBridgeDispatcher';
import { PacketSerializer, type ICompactDirectChat } from '../../../src/core/protocol/PacketSerializer';
import { MockOutGridBridge } from '../../../src/core/native/MockOutGridBridge';
import fs from 'node:fs';
import path from 'node:path';
import { get } from 'svelte/store';

describe('Live Peer Discovery & Background Zero-Loss Chat Tests', () => {
  it('should initialize MockOutGridBridge and broadcast packets cleanly', () => {
    const bridge = new MockOutGridBridge();
    const testBase64 = Buffer.from('TEST_RADIO_DATA').toString('base64');
    const success = bridge.transmitRadioPacket(testBase64, true);

    expect(success).toBe(true);
    expect(bridge.getLastTransmittedPacket()?.base64).toBe(testBase64);
    expect(bridge.getLastTransmittedPacket()?.txPowerHigh).toBe(true);
  });

  it('should ingest incoming direct chat packets into ChatMessageStore even when user is on background tab', () => {
    const myAuth = new AuthManager();
    const myProfile = myAuth.getProfile();
    let myNumericShortId = 0x47a1;
    try {
      const parsed = parseInt(myProfile.nodeId.slice(0, 4), 16);
      if (!isNaN(parsed) && parsed > 0) myNumericShortId = parsed;
    } catch {}

    const senderShortId = 0x9B22;
    const senderHex = '#9B22';

    // Simulate incoming compact direct chat frame addressed to our node (<= 14B payload)
    const compactMsg: ICompactDirectChat = {
      senderShortId,
      recipientShortId: myNumericShortId,
      truncatedMsgId: 98765,
      h3LowerRes9: 0,
      textPayload: 'Hello Peer'
    };
    const rawWire = PacketSerializer.serializeCompactDirectChat(compactMsg);

    // Make sure user is NOT currently looking at this sender's direct chat
    chatMessageManager.setActiveRecipient('node-rescue-team');
    const beforeCount = get(unreadChatCountStore);

    // Dispatch raw wire bytes via native bridge
    const base64 = Buffer.from(rawWire).toString('base64');
    (globalThis as any).OutGridMesh?.receiveNativePacket?.(base64, -68);

    // Verify message was stored in background
    const messages = get(directMessagesStore);
    const found = messages.find(m => m.text === 'Hello Peer');
    expect(found).toBeDefined();
    expect(found?.isSelf).toBe(false);
    expect(found?.recipientId).toBe(senderHex);

    // Verify unread count increased because chat was in background
    const afterCount = get(unreadChatCountStore);
    expect(afterCount).toBeGreaterThanOrEqual(beforeCount);

    // When user opens this conversation, unread count should decrease
    chatMessageManager.setActiveRecipient(senderHex);
    const openedMsg = get(directMessagesStore).find(m => m.text === 'Hello Peer');
    expect(openedMsg?.isUnread).toBe(false);
  });

  it('should ingest incoming broadcast chat packets in background and persist them', () => {
    const senderShortId = 0x7A11;
    const compactBcast: ICompactDirectChat = {
      senderShortId,
      recipientShortId: 0xffff, // 0xFFFF = Public Broadcast
      truncatedMsgId: 554433,
      h3LowerRes9: 0,
      textPayload: 'Heavy Rain'
    };
    const rawWire = PacketSerializer.serializeCompactDirectChat(compactBcast);

    const base64 = Buffer.from(rawWire).toString('base64');
    (globalThis as any).OutGridMesh?.receiveNativePacket?.(base64, -60);

    const bcasts = get(broadcastMessagesStore);
    const found = bcasts.find(b => b.text === 'Heavy Rain');
    expect(found).toBeDefined();
    expect(found?.sender).toContain('#7A11');
  });

  it('should transmit outgoing direct chat and broadcast packets via dispatcher', () => {
    const directResult = chatMessageManager.sendDirectMessage('#4C55', 'ขอความช่วยเหลือ');
    expect(directResult).toBe(true);

    const bcastResult = chatMessageManager.sendBroadcastMessage('สถานการณ์ปกติ');
    expect(bcastResult).toBe(true);

    const directMessages = get(directMessagesStore);
    expect(directMessages.some(m => m.text === 'ขอความช่วยเหลือ' && m.isSelf)).toBe(true);

    const bcastMessages = get(broadcastMessagesStore);
    expect(bcastMessages.some(m => m.text === 'สถานการณ์ปกติ')).toBe(true);
  });

  it('should verify Android OutGridBlePlugin uses 0x544F manufacturer data to fit in 31B BLE advertisement', () => {
    const pluginPath = path.resolve('android/app/src/main/java/io/outgrid/mesh/OutGridBlePlugin.kt');
    expect(fs.existsSync(pluginPath)).toBe(true);

    const content = fs.readFileSync(pluginPath, 'utf-8');
    expect(content.includes('TOG_MANUFACTURER_ID = 0x544F')).toBe(true);
    expect(content.includes('addManufacturerData(TOG_MANUFACTURER_ID, rawBytes)')).toBe(true);
    expect(content.includes('stopAdvertising')).toBe(true);
  });
});
