/**
 * Unit tests for MeshtasticAdapter
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, it, expect } from 'bun:test';
import { MeshtasticAdapter } from '../../../src/core/adapters/meshtasticAdapter';
import { ITOGPacket, TOGPacketType, TOGPriority } from '../../../src/core/protocol/TOGPacket';

describe('MeshtasticAdapter (LoRa Cross-Link Bridge)', () => {
  it('should serialize TOG packet into Meshtastic frame with Port 77', () => {
    const pkt: ITOGPacket = {
      header: {
        magic: 0x544F,
        version: 1,
        packetType: TOGPacketType.SOS_BEACON,
        ttlHops: 5,
        priority: TOGPriority.CRITICAL_SOS,
        flags: 0,
        reserved: 0,
      },
      messageId: 88888888n,
      senderPubkeyHash: new Uint8Array([1, 1, 1, 1, 1, 1, 1, 1]),
      recipientHash: new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]),
      targetH3Index: 0x8828308281fffff0n,
      payloadLength: 4,
      payload: new Uint8Array([0xAA, 0xBB, 0xCC, 0xDD]),
    };

    const loraFrame = MeshtasticAdapter.togToMeshtastic(pkt);
    expect(loraFrame.portnum).toBe(77);
    expect(loraFrame.hopLimit).toBe(5);
    expect(loraFrame.payload.length).toBeGreaterThan(0);

    const backToTog = MeshtasticAdapter.meshtasticToTog(loraFrame);
    expect(backToTog.messageId).toBe(88888888n);
    expect(backToTog.header.packetType).toBe(TOGPacketType.SOS_BEACON);
    expect(backToTog.payload).toEqual(new Uint8Array([0xAA, 0xBB, 0xCC, 0xDD]));
  });

  it('should reject frame if portnum does not match TOG custom port', () => {
    expect(() => {
      MeshtasticAdapter.meshtasticToTog({
        portnum: 1, // TEXT_MESSAGE_APP
        payload: new Uint8Array([1, 2, 3]),
        wantAck: false,
        hopLimit: 3,
      });
    }).toThrow('Unsupported Meshtastic portnum');
  });
});
