/**
 * Unit & Integration Tests for Chat Deduplication & SOS Broadcast Delivery Fixes
 * Fixes:
 * 1. Suppresses burst duplicate BLE packets so chat messages do not repeat multiple times.
 * 2. Ensures One-Tap SOS broadcasts strictly <=27B BLE packets and alerts public chat + nearby peers.
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Reliable Delivery Pipeline
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { AuthManager } from '../../../src/core/auth/AuthManager';
import {
  chatMessageManager,
  directMessagesStore,
  broadcastMessagesStore,
  unreadChatCountStore
} from '../../../src/core/state/ChatMessageStore';
import { NativeBridgeDispatcher } from '../../../src/core/native/NativeBridgeDispatcher';
import { OneTapSosEngine, SosStatusCategory } from '../../../src/core/state/OneTapSosEngine';
import { PacketSerializer, type ICompactDirectChat } from '../../../src/core/protocol/PacketSerializer';
import { TOGPacketType, CannedEmergencyCode } from '../../../src/core/protocol/TOGPacket';
import { H3DeltaCompressor } from '../../../src/core/spatial/H3DeltaCompressor';
import { get } from 'svelte/store';

describe('Chat Deduplication & SOS Delivery Fixes', () => {
  let auth: AuthManager;
  let myNumericShortId = 0x47a1;

  beforeEach(() => {
    NativeBridgeDispatcher.getInstance();
    const authInstance = (chatMessageManager as any).auth || (chatMessageManager as any).authManager || new AuthManager();
    const profile = authInstance.getProfile();
    try {
      const parsed = parseInt(profile.nodeId.slice(0, 4), 16);
      if (!isNaN(parsed) && parsed > 0) myNumericShortId = parsed;
    } catch {}
  });

  describe('Chat Deduplication Engine', () => {
    it('should drop repeated burst BLE packets and display message exactly once', () => {
      const senderShortId = 0x5d72;
      const senderHex = '#5D72';
      const testMsgId = 17290088;
      const text = 'ว่าไง';

      const compactMsg: ICompactDirectChat = {
        senderShortId,
        recipientShortId: myNumericShortId,
        truncatedMsgId: testMsgId,
        h3LowerRes9: 0,
        textPayload: text
      };
      const rawWire = PacketSerializer.serializeCompactDirectChat(compactMsg);
      const base64 = Buffer.from(rawWire).toString('base64');

      chatMessageManager.setActiveRecipient(senderHex);

      const countBefore = get(directMessagesStore).filter(
        m => m.sender.includes(senderHex) && m.text === text && m.id === `d-${testMsgId}`
      ).length;
      expect(countBefore).toBe(0);

      // Simulate Android BLE receiving 6 burst scan results of the exact same packet within 500ms
      for (let i = 0; i < 6; i++) {
        (globalThis as any).OutGridMesh?.receiveNativePacket?.(base64, -65);
      }

      // Verify the message was ingested EXACTLY ONCE
      const matching = get(directMessagesStore).filter(
        m => m.sender.includes(senderHex) && m.text.startsWith('ว่า') && m.id === `d-${testMsgId}`
      );
      expect(matching.length).toBe(1);
      expect(matching[0].isSelf).toBe(false);
    });

    it('should deduplicate public broadcast chat messages from BLE bursts', () => {
      const senderShortId = 0x8e12;
      const testMsgId = 998877;
      const text = 'Help';

      const compactBcast: ICompactDirectChat = {
        senderShortId,
        recipientShortId: 0xffff, // Broadcast
        truncatedMsgId: testMsgId,
        h3LowerRes9: 0,
        textPayload: text
      };
      const rawWire = PacketSerializer.serializeCompactDirectChat(compactBcast);
      const base64 = Buffer.from(rawWire).toString('base64');

      // Simulate 5 duplicate BLE advertisement frames received
      for (let i = 0; i < 5; i++) {
        (globalThis as any).OutGridMesh?.receiveNativePacket?.(base64, -70);
      }

      const matching = get(broadcastMessagesStore).filter(
        b => b.id === `b-${testMsgId}` && b.text === text
      );
      expect(matching.length).toBe(1);
    });

    it('should correctly flag duplicates using isDuplicatePacket helper', () => {
      const now = Date.now();
      const key = 'test-packet-dedup-key-1';

      expect(chatMessageManager.isDuplicatePacket(key, now)).toBe(false);
      // Immediate duplicate within window
      expect(chatMessageManager.isDuplicatePacket(key, now + 100)).toBe(true);
      expect(chatMessageManager.isDuplicatePacket(key, now + 2000)).toBe(true);
      // After window expiration (15 seconds)
      expect(chatMessageManager.isDuplicatePacket(key, now + 16000)).toBe(false);
    });
  });

  describe('One-Tap SOS Beacon & Canned Emergency Delivery', () => {
    it('should create Compact SOS Beacon strictly within 21 bytes for BLE legacy advertising', () => {
      const lat = 13.7563;
      const lng = 100.5018;

      const compactSosBytes = OneTapSosEngine.createCompactSosBeacon({
        lat,
        lng,
        batteryLevel: 90,
        category: SosStatusCategory.NEED_BOAT,
        senderPubkeyHash: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])
      }, 42);

      // Must be strictly 21 bytes to fit inside 27B BLE advertisement payload limit
      expect(compactSosBytes.length).toBe(21);
      expect(compactSosBytes[0]).toBe(0x54);
      expect(compactSosBytes[1]).toBe(0x4f); // TOG Magic

      // Must deserialize correctly
      const decoded = PacketSerializer.deserializeCompactSOS(compactSosBytes);
      expect(decoded.seqId).toBe(42);
      expect(decoded.batteryPct).toBe(90);

      const decomp = H3DeltaCompressor.decompress(decoded.h3Index, {
        deltaX: decoded.deltaX,
        deltaY: decoded.deltaY
      });
      expect(Math.abs(decomp.lat - lat)).toBeLessThan(0.0001);
      expect(Math.abs(decomp.lng - lng)).toBeLessThan(0.0001);
    });

    it('should create Canned Emergency Beacon strictly within 10 bytes with sender Short ID', () => {
      const senderShortId = 0x7d9e;
      const cannedBytes = OneTapSosEngine.createCannedEmergencyBeacon(
        senderShortId,
        SosStatusCategory.NEED_BOAT,
        85,
        1234
      );

      // Must be strictly 10 bytes
      expect(cannedBytes.length).toBe(10);

      // Must deserialize correctly
      const decoded = PacketSerializer.deserializeCannedEmergency(cannedBytes);
      expect(decoded.senderShortId).toBe(senderShortId);
      expect(decoded.sequenceId).toBe(1234);
      expect(decoded.statusCode).toBe(CannedEmergencyCode.FLOOD_DANGER);
      expect(decoded.packetType).toBe(TOGPacketType.SOS_BEACON);
    });
  });
});
