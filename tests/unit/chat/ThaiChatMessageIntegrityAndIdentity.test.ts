import { describe, expect, it } from 'bun:test';
import { AuthManager } from '../../../src/core/auth/AuthManager';
import {
  chatMessageManager,
  directMessagesStore,
  broadcastMessagesStore
} from '../../../src/core/state/ChatMessageStore';
import { NativeBridgeDispatcher } from '../../../src/core/native/NativeBridgeDispatcher';
import { PacketSerializer } from '../../../src/core/protocol/PacketSerializer';
import {
  TOGPacketType,
  TOG_MAGIC,
  type ITOGPacket,
  type ICompactDirectChat
} from '../../../src/core/protocol/TOGPacket';
import { get } from 'svelte/store';

describe('Thai Chat Message Integrity & Device Identity Verification', () => {
  it('should verify current logged-in device identity, short Node ID and display name', () => {
    const auth = new AuthManager();
    const profile = auth.getProfile();

    expect(profile.nodeId).toBeDefined();
    expect(profile.nodeId.length).toBeGreaterThanOrEqual(4);

    const shortHex = profile.nodeId.slice(0, 4).toUpperCase();
    const expectedBadge = `#${shortHex}`;
    expect(expectedBadge).toMatch(/^#[0-9A-F]{4}$/);

    expect(profile.displayName).toBeDefined();
    const hasShortHex = profile.displayName.toUpperCase().includes(shortHex);
    const hasValidName = profile.displayName.length >= 2;
    expect(hasShortHex || hasValidName).toBe(true);
  });

  it('should transmit full Thai message "สบายดีไหม" without 14-byte truncation', () => {
    const dispatcher = NativeBridgeDispatcher.getInstance();
    let lastTransmittedBytes: Uint8Array | null = null;

    const originalTransmit = dispatcher.transmitRadioPacket.bind(dispatcher);
    dispatcher.transmitRadioPacket = (bytes: Uint8Array, txPowerHigh: boolean = true) => {
      lastTransmittedBytes = bytes;
      return true;
    };

    try {
      const fullThaiText = 'สบายดีไหม';
      const targetPeer = '#5D72';

      const success = chatMessageManager.sendDirectMessage(targetPeer, fullThaiText);
      expect(success).toBe(true);

      expect(lastTransmittedBytes).not.toBeNull();
      const transmitted = lastTransmittedBytes!;

      // "สบายดีไหม" is 27 bytes in UTF-8
      // Header is 39 bytes -> total size is 39 + 27 = 66 bytes
      expect(transmitted.length).toBeGreaterThanOrEqual(39);
      expect(transmitted[0]).toBe(0x54); // 'T'
      expect(transmitted[1]).toBe(0x4F); // 'O'

      // Must deserialize into complete untruncated TOGPacket
      const deserialized = PacketSerializer.deserialize(transmitted);
      expect(deserialized.header.packetType).toBe(TOGPacketType.DIRECT_CHAT);
      const decodedText = new TextDecoder('utf-8').decode(deserialized.payload);
      expect(decodedText).toBe('สบายดีไหม');
      expect(decodedText).not.toBe('สบาย');
    } finally {
      dispatcher.transmitRadioPacket = originalTransmit;
    }
  });

  it('should transmit full Thai broadcast message "สวัสดีทุกคน" without truncation', () => {
    const dispatcher = NativeBridgeDispatcher.getInstance();
    let lastTransmittedBytes: Uint8Array | null = null;

    const originalTransmit = dispatcher.transmitRadioPacket.bind(dispatcher);
    dispatcher.transmitRadioPacket = (bytes: Uint8Array, txPowerHigh: boolean = true) => {
      lastTransmittedBytes = bytes;
      return true;
    };

    try {
      const fullThaiBcast = 'สวัสดีทุกคน';
      const success = chatMessageManager.sendBroadcastMessage(fullThaiBcast);
      expect(success).toBe(true);

      expect(lastTransmittedBytes).not.toBeNull();
      const transmitted = lastTransmittedBytes!;

      expect(transmitted.length).toBeGreaterThanOrEqual(39);
      const deserialized = PacketSerializer.deserialize(transmitted);
      expect(deserialized.header.packetType).toBe(TOGPacketType.GROUP_CHAT);
      const decodedText = new TextDecoder('utf-8').decode(deserialized.payload);
      expect(decodedText).toBe('สวัสดีทุกคน');
    } finally {
      dispatcher.transmitRadioPacket = originalTransmit;
    }
  });

  it('should upgrade existing truncated chat message when full standard TOG packet arrives', () => {
    const authInstance = (chatMessageManager as any).auth || (chatMessageManager as any).authManager || new AuthManager();
    const myProfile = authInstance.getProfile();
    let myNumericShortId = 0x47a1;
    try {
      const parsed = parseInt(myProfile.nodeId.slice(0, 4), 16);
      if (!isNaN(parsed) && parsed > 0) myNumericShortId = parsed;
    } catch {}

    const senderShortId = 0x5d72; // Peer #5D72
    const now = Date.now();

    // 1. Simulate arrival of truncated compact message ("สบาย")
    const compactMsg: ICompactDirectChat = {
      senderShortId,
      recipientShortId: myNumericShortId,
      truncatedMsgId: (now & 0xffffffff) >>> 0,
      h3LowerRes9: 0,
      textPayload: 'สบาย' // Truncated text
    };
    const compactBytes = PacketSerializer.serializeCompactDirectChat(compactMsg);
    chatMessageManager.handleIncomingRadioPacket(compactBytes, -70);

    const msgsAfterCompact = get(directMessagesStore);
    const compactEntry = msgsAfterCompact.find(m => m.sender.includes('#5D72') && m.text === 'สบาย');
    expect(compactEntry).toBeDefined();

    // 2. Simulate arrival of full standard TOG packet ("สบายดีไหม")
    const fullText = 'สบายดีไหม';
    const payloadBytes = new TextEncoder().encode(fullText);
    const recipientHash = new Uint8Array(8);
    recipientHash[0] = (myNumericShortId >> 8) & 0xff;
    recipientHash[1] = myNumericShortId & 0xff;

    const fullPacket: ITOGPacket = {
      header: {
        magic: TOG_MAGIC,
        version: 1,
        packetType: TOGPacketType.DIRECT_CHAT,
        ttlHops: 4,
        priority: 0,
        flags: 0,
        reserved: 0
      },
      messageId: BigInt(now),
      senderPubkeyHash: new Uint8Array([0x5d, 0x72, 0, 0, 0, 0, 0, 0]),
      recipientHash,
      targetH3Index: 0n,
      payloadLength: payloadBytes.length,
      payload: payloadBytes
    };
    const standardBytes = PacketSerializer.serialize(fullPacket);
    chatMessageManager.handleIncomingRadioPacket(standardBytes, -70);

    // 3. Verify message is now upgraded to full untruncated text
    const msgsAfterFull = get(directMessagesStore);
    const fullEntry = msgsAfterFull.find(m => m.sender.includes('#5D72') && m.text === 'สบายดีไหม');
    expect(fullEntry).toBeDefined();
    expect(fullEntry?.text).toBe('สบายดีไหม');
  });
});
