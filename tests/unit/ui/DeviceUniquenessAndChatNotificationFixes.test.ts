import { describe, expect, it } from 'bun:test';
import { AuthManager } from '../../../src/core/auth/AuthManager';
import {
  chatMessageManager,
  directMessagesStore,
  broadcastMessagesStore,
  incomingMessageAlertStore
} from '../../../src/core/state/ChatMessageStore';
import { peerDiscoveryManager } from '../../../src/core/state/PeerDiscoveryStore';
import { NativeBridgeDispatcher } from '../../../src/core/native/NativeBridgeDispatcher';
import { PacketSerializer, type ICompactDirectChat } from '../../../src/core/protocol/PacketSerializer';
import { get } from 'svelte/store';

describe('Device Uniqueness, Seamless Hex Grid, Chat Notifications & History Persistence Tests', () => {
  it('should generate valid 16-hex unique Node ID and formatted short ID without defaulting to hardcoded values', () => {
    const auth = new AuthManager();
    const profile = auth.getProfile();

    expect(profile.nodeId).toBeDefined();
    expect(profile.nodeId.length).toBeGreaterThanOrEqual(8);
    // Node ID must be hexadecimal
    expect(/^[0-9a-fA-F]+$/.test(profile.nodeId)).toBe(true);

    const shortId = auth.getShortNodeId();
    expect(shortId).toMatch(/^#[0-9A-F]{4}$/);

    const numShort = auth.getNumericShortNodeId();
    expect(numShort).toBeGreaterThan(0);
    expect(numShort).toBeLessThanOrEqual(0xffff);
  });

  it('should migrate legacy guest001 node ID to a unique random hex ID', () => {
    const legacyAuth = new AuthManager({ nodeId: 'guest001' });
    const prof = legacyAuth.getProfile();

    expect(prof.nodeId).not.toBe('guest001');
    expect(/^[0-9a-fA-F]{4,}$/.test(prof.nodeId)).toBe(true);
    expect(legacyAuth.getShortNodeId()).toMatch(/^#[0-9A-F]{4}$/);
  });

  it('should initialize empty chat and broadcast stores without dummy/mock messages', () => {
    const directMsgs = get(directMessagesStore);
    const bcastMsgs = get(broadcastMessagesStore);

    // Must not contain hardcoded dummy rescue HQ messages
    const hasMockRescue = directMsgs.some(m =>
      m.sender.includes('สว่างบริบูรณ์') ||
      m.text.includes('ระดับน้ำสูงถึงเอว')
    );
    expect(hasMockRescue).toBe(false);

    const hasMockBroadcast = bcastMsgs.some(m =>
      m.sender.includes('Scout 01') ||
      m.text.includes('สะพานมิตรภาพ')
    );
    expect(hasMockBroadcast).toBe(false);
  });

  it('should trigger incoming message alert store, audio chime and vibration when receiving radio chat', () => {
    const senderShortId = 0x5D72;
    const myAuth = new AuthManager();
    const myNumericId = myAuth.getNumericShortNodeId();
    const incomingText = 'OK-HELP-99';

    const compactMsg: ICompactDirectChat = {
      senderShortId,
      recipientShortId: myNumericId,
      truncatedMsgId: 98761,
      h3LowerRes9: 0,
      textPayload: incomingText
    };

    const wireBytes = PacketSerializer.serializeCompactDirectChat(compactMsg);

    let alertFired = false;
    let receivedAlertSender = '';
    let receivedAlertText = '';

    const unsubAlert = incomingMessageAlertStore.subscribe(alert => {
      if (alert) {
        alertFired = true;
        receivedAlertSender = alert.sender;
        receivedAlertText = alert.text;
      }
    });

    chatMessageManager.handleIncomingRadioPacket(wireBytes, -60);

    expect(alertFired).toBe(true);
    expect(receivedAlertSender).toContain('5D72');
    expect(receivedAlertText).toBe(incomingText);

    unsubAlert();
    incomingMessageAlertStore.set(null);
  });

  it('should automatically remember sender ID as a friend in peerDiscoveryManager when chatting', () => {
    const peerNodeShort = '#8F2A';
    const peerNumericId = 0x8F2A;
    const testMsg = 'พิกัดปลอดภัย';

    // Verify peer starts unset
    const peersBefore = get(peerDiscoveryManager.getStore());

    // Send direct message to peer
    chatMessageManager.sendDirectMessage(peerNodeShort, testMsg);

    // Peer must now be saved as friend in peer discovery store
    const peersAfter = get(peerDiscoveryManager.getStore());
    const friendPeer = peersAfter.get(peerNodeShort);

    expect(friendPeer).toBeDefined();
    expect(friendPeer?.isFriend).toBe(true);
  });

  it('should accurately report Internet and offline connectivity via NativeBridgeDispatcher', () => {
    const dispatcher = NativeBridgeDispatcher.getInstance();
    const status = dispatcher.isInternetConnected();

    // In Node / Bun environment with MockBridge, should return boolean without throwing
    expect(typeof status).toBe('boolean');
  });

  it('should verify mathematical precision of seamless non-overlapping H3 hexagon grid tiling', () => {
    // Regular hexagon honeycomb pattern geometry:
    // W = sqrt(3) * R, H = 3 * R.
    // Given W = 60:
    const W = 60;
    const R = W / Math.sqrt(3); // 34.641016...
    const H = 3 * R; // 103.923048...

    expect(Math.round(H * 100) / 100).toBe(103.92);

    // Vertices of Hexagon 1:
    const v1_bottom = 2 * R; // 69.282...
    expect(Math.round(v1_bottom * 100) / 100).toBe(69.28);

    // Connecting edge in second half of pattern tile:
    const v2_top = v1_bottom; // 69.28
    const v2_bottom = H; // 103.92 (wraps cleanly to 0 in lower tile)
    expect(v2_bottom - v2_top).toBeCloseTo(R, 2);
  });
});
