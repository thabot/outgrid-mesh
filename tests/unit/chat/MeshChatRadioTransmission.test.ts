import { describe, expect, it } from 'bun:test';
import { NativeBridgeDispatcher } from '../../../src/core/native/NativeBridgeDispatcher';
import { PacketSerializer } from '../../../src/core/protocol/PacketSerializer';
import {
  TOGPacketType,
  TOGPriority,
  DEFAULT_CHAT_HOPS,
  TOG_MAGIC,
  type ITOGPacket,
  type ICompactDirectChat
} from '../../../src/core/protocol/TOGPacket';
import { AuthManager } from '../../../src/core/auth/AuthManager';

describe('Mesh Chat Radio Transmission & Inbound Dispatcher', () => {
  it('should serialize, transmit over radio, and decode a Compact Direct Chat message between two peers', () => {
    const senderShortId = 0x47a1;
    const recipientShortId = 0x4c55;
    const text = 'OK-SOS-47';

    const compactMsg: ICompactDirectChat = {
      senderShortId,
      recipientShortId,
      truncatedMsgId: 123456,
      h3LowerRes9: 0,
      textPayload: text
    };

    const wireBytes = PacketSerializer.serializeCompactDirectChat(compactMsg);
    expect(wireBytes.length).toBeLessThanOrEqual(28);
    expect(wireBytes[0]).toBe(0x54); // 'T'
    expect(wireBytes[1]).toBe(0x4f); // 'O'

    // Node B listens on radio dispatcher
    let receivedSenderHex = '';
    let receivedText = '';
    let receivedIsForMe = false;

    const myNodeShortId = 0x4c55; // Node B

    const unsub = NativeBridgeDispatcher.getInstance().subscribeToPackets(ev => {
      if (ev.bytes.length <= 28) {
        const decoded = PacketSerializer.deserializeCompactDirectChat(ev.bytes);
        if (decoded.senderShortId !== myNodeShortId) {
          if (decoded.recipientShortId === myNodeShortId || decoded.recipientShortId === 0xffff) {
            receivedSenderHex = `#${decoded.senderShortId.toString(16).padStart(4, '0').toUpperCase()}`;
            receivedText = decoded.textPayload;
            receivedIsForMe = true;
          }
        }
      }
    });

    // Simulate Node A transmitting over radio bridge
    const dispatcher = NativeBridgeDispatcher.getInstance();
    const txOk = dispatcher.transmitRadioPacket(wireBytes, true);
    expect(txOk).toBe(true);

    // Simulate native platform dispatching the received radio packet to Node B
    const base64 = Buffer.from(wireBytes).toString('base64');
    (globalThis as any).OutGridMesh?.receiveNativePacket?.(base64, -68);

    unsub();

    expect(receivedIsForMe).toBe(true);
    expect(receivedSenderHex).toBe('#47A1');
    expect(receivedText).toBe(text);
  });

  it('should ignore incoming direct messages intended for a different node (Recipient Filtering)', () => {
    const senderShortId = 0x47a1;
    const recipientShortId = 0x9999; // Target is node 0x9999
    const myNodeShortId = 0x4c55; // We are node 0x4C55

    const compactMsg: ICompactDirectChat = {
      senderShortId,
      recipientShortId,
      truncatedMsgId: 99999,
      h3LowerRes9: 0,
      textPayload: 'SECRET'
    };

    const wireBytes = PacketSerializer.serializeCompactDirectChat(compactMsg);

    let messageAccepted = false;
    const unsub = NativeBridgeDispatcher.getInstance().subscribeToPackets(ev => {
      if (ev.bytes.length <= 28) {
        const decoded = PacketSerializer.deserializeCompactDirectChat(ev.bytes);
        if (decoded.recipientShortId === myNodeShortId || decoded.recipientShortId === 0xffff) {
          messageAccepted = true;
        }
      }
    });

    const base64 = Buffer.from(wireBytes).toString('base64');
    (globalThis as any).OutGridMesh?.receiveNativePacket?.(base64, -72);

    unsub();

    expect(messageAccepted).toBe(false);
  });

  it('should deliver broadcast chat message to all listening nodes (0xFFFF)', () => {
    const senderShortId = 0x47a1;
    const recipientShortId = 0xffff; // Broadcast
    const myNodeShortId = 0x4c55;

    const broadcastMsg: ICompactDirectChat = {
      senderShortId,
      recipientShortId,
      truncatedMsgId: 8888,
      h3LowerRes9: 0,
      textPayload: 'HELP-NOW'
    };

    const wireBytes = PacketSerializer.serializeCompactDirectChat(broadcastMsg);

    let receivedBroadcastText = '';
    const unsub = NativeBridgeDispatcher.getInstance().subscribeToPackets(ev => {
      if (ev.bytes.length <= 28) {
        const decoded = PacketSerializer.deserializeCompactDirectChat(ev.bytes);
        if (decoded.recipientShortId === 0xffff) {
          receivedBroadcastText = decoded.textPayload;
        }
      }
    });

    const base64 = Buffer.from(wireBytes).toString('base64');
    (globalThis as any).OutGridMesh?.receiveNativePacket?.(base64, -60);

    unsub();

    expect(receivedBroadcastText).toBe('HELP-NOW');
  });

  it('should serialize and receive standard multi-hop TOG Direct Chat packets with full text payloads', () => {
    const authA = new AuthManager();
    const profA = authA.getProfile();
    const pubKeyHashA = profA.keyPair.publicKey.slice(0, 8);

    const recipientHash = new Uint8Array([0x4c, 0x55, 0, 0, 0, 0, 0, 0]);
    const textPayload = 'ต้องการส่งพิกัดแพทย์ฉุกเฉินโซนเหนือระดับน้ำ 1.2 เมตร';
    const payloadBytes = new TextEncoder().encode(textPayload);

    const packet: ITOGPacket = {
      header: {
        magic: TOG_MAGIC,
        version: 1,
        packetType: TOGPacketType.DIRECT_CHAT,
        ttlHops: DEFAULT_CHAT_HOPS,
        priority: TOGPriority.NORMAL,
        flags: 0,
        reserved: 0
      },
      messageId: 9988776655443322n,
      senderPubkeyHash: pubKeyHashA,
      recipientHash,
      targetH3Index: 0n,
      payloadLength: payloadBytes.length,
      payload: payloadBytes
    };

    const wireBytes = PacketSerializer.serialize(packet);
    expect(wireBytes.length).toBe(39 + payloadBytes.length);

    let decodedMessage = '';
    const unsub = NativeBridgeDispatcher.getInstance().subscribeToPackets(ev => {
      if (ev.bytes.length >= 39) {
        const parsed = PacketSerializer.deserialize(ev.bytes);
        if (parsed.header.packetType === TOGPacketType.DIRECT_CHAT) {
          decodedMessage = new TextDecoder('utf-8').decode(parsed.payload);
        }
      }
    });

    const base64 = Buffer.from(wireBytes).toString('base64');
    (globalThis as any).OutGridMesh?.receiveNativePacket?.(base64, -65);

    unsub();

    expect(decodedMessage).toBe(textPayload);
  });
});
