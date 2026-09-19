/**
 * Delivery Receipt Engine (Reverse Signed ACK & NACK)
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import {
  TOG_MAGIC,
  TOGPacketType,
  TOGPriority,
  type ITOGPacket
} from '../protocol/TOGPacket';
import { DigitalSignature } from '../crypto/DigitalSignature';
import type { SqliteStorageEngine } from '../storage/SqliteStorageEngine';

export class DeliveryReceipt {
  /**
   * Generates a signed reverse ACK packet (`0x05`) from the recipient
   * Size: 10 Bytes payload (originalMsgId 8B + status 2B)
   */
  public static createSignedAck(
    originalMsgId: bigint,
    recipientPrivateKey: Uint8Array,
    recipientPubkeyHash: Uint8Array,
    originalSenderHash: Uint8Array,
    targetH3Index: bigint
  ): ITOGPacket {
    // 10 Bytes payload: 8 Bytes Original Message ID + 2 Bytes Status (0x0001 = Delivered)
    const payload = new Uint8Array(10);
    const view = new DataView(payload.buffer);
    view.setBigUint64(0, originalMsgId, false);
    view.setUint16(8, 0x0001, false);

    // Sign originalMsgId with recipient private key
    const sigMessage = new Uint8Array(8);
    new DataView(sigMessage.buffer).setBigUint64(0, originalMsgId, false);
    const signature = DigitalSignature.sign(sigMessage, recipientPrivateKey);

    // Concatenate 10B payload + 64B signature = 74B total ACK payload
    const fullPayload = new Uint8Array(10 + 64);
    fullPayload.set(payload, 0);
    fullPayload.set(signature, 10);

    const ackPacket: ITOGPacket = {
      header: {
        magic: TOG_MAGIC,
        version: 1,
        packetType: TOGPacketType.DELIVERY_ACK,
        ttlHops: 7,
        priority: TOGPriority.HIGH,
        flags: 0,
        reserved: 0
      },
      messageId: originalMsgId ^ 0xacacacacacacacacn,
      senderPubkeyHash: recipientPubkeyHash,
      recipientHash: originalSenderHash,
      targetH3Index: targetH3Index,
      payloadLength: fullPayload.length,
      payload: fullPayload
    };

    return ackPacket;
  }

  /**
   * Processes an incoming ACK packet: verifies signature and triggers auto-prune
   */
  public static processAck(
    ackPacket: ITOGPacket,
    storage: SqliteStorageEngine,
    recipientPublicKey: Uint8Array
  ): { originalMsgId: bigint; isValid: boolean } | null {
    if (ackPacket.header.packetType !== TOGPacketType.DELIVERY_ACK) {
      return null;
    }

    if (ackPacket.payload.length < 74) {
      return null;
    }

    const view = new DataView(ackPacket.payload.buffer, ackPacket.payload.byteOffset, 10);
    const originalMsgId = view.getBigUint64(0, false);
    const signature = ackPacket.payload.subarray(10, 74);

    const sigMessage = new Uint8Array(8);
    new DataView(sigMessage.buffer).setBigUint64(0, originalMsgId, false);

    const isValid = DigitalSignature.verify(signature, sigMessage, recipientPublicKey);
    if (!isValid) {
      return { originalMsgId, isValid: false };
    }

    // Mark as delivered in local storage and trigger auto-prune
    const msgHex = originalMsgId.toString(16);
    storage.updateDeliveryStatus(msgHex, 'delivered');

    return { originalMsgId, isValid: true };
  }
}
