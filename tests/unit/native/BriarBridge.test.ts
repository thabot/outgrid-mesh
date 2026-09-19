/**
 * Unit tests for BriarAdapter
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, it, expect } from 'bun:test';
import { BriarAdapter } from '../../../src/core/adapters/briarAdapter';
import { ITOGPacket, TOGPacketType, TOGPriority } from '../../../src/core/protocol/TOGPacket';

describe('BriarAdapter (Briar Bramble Cross-Bridge)', () => {
  it('should encapsulate TOG packet into Briar frame and unpack with 100% fidelity', () => {
    const pkt: ITOGPacket = {
      header: {
        magic: 0x544F,
        version: 1,
        packetType: TOGPacketType.GROUP_CHAT,
        ttlHops: 3,
        priority: TOGPriority.HIGH,
        flags: 0,
        reserved: 0,
      },
      messageId: 999999n,
      senderPubkeyHash: new Uint8Array([2, 2, 2, 2, 2, 2, 2, 2]),
      recipientHash: new Uint8Array([3, 3, 3, 3, 3, 3, 3, 3]),
      targetH3Index: 0x8828308281fffff0n,
      payloadLength: 5,
      payload: new Uint8Array([1, 3, 5, 7, 9]),
    };

    const briarFrame = BriarAdapter.togToBriar(pkt, 42);
    expect(briarFrame.streamId).toBe(0x47);
    expect(briarFrame.frameSequence).toBe(42);
    expect(briarFrame.payloadLength).toBe(briarFrame.data.length);

    const unpacked = BriarAdapter.briarToTog(briarFrame);
    expect(unpacked.messageId).toBe(999999n);
    expect(unpacked.header.packetType).toBe(TOGPacketType.GROUP_CHAT);
    expect(unpacked.payload).toEqual(new Uint8Array([1, 3, 5, 7, 9]));
  });

  it('should reject frame with non-TOG stream ID', () => {
    expect(() => {
      BriarAdapter.briarToTog({
        streamId: 0x01, // Not 0x47
        frameSequence: 0,
        payloadLength: 3,
        data: new Uint8Array([1, 2, 3]),
      });
    }).toThrow('Invalid Briar Stream ID');
  });
});
