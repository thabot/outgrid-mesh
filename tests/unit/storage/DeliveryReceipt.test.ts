/**
 * Unit tests for DeliveryReceipt (Reverse Signed ACK & NACK Engine)
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, expect, it } from 'bun:test';
import { DeliveryReceipt } from '../../../src/core/routing/DeliveryReceipt';
import { DigitalSignature } from '../../../src/core/crypto/DigitalSignature';
import { SqliteStorageEngine } from '../../../src/core/storage/SqliteStorageEngine';
import type { IStoredMessage } from '../../../src/core/storage/schema';

describe('DeliveryReceipt (Reverse Signed ACK & Auto-Prune)', () => {
  it('should create valid signed ACK and update message delivery status to 🟢 delivered', () => {
    const storage = new SqliteStorageEngine();
    const recipientKeys = DigitalSignature.generateKeyPair();

    const originalMsgId = 0x1122334455667788n;
    const msgHex = originalMsgId.toString(16);

    const testMsg: IStoredMessage = {
      id: msgHex,
      packetType: 0x02,
      priority: 8,
      senderHash: 'sender1',
      recipientHash: 'recip1',
      targetH3Index: 'h3',
      payload: new Uint8Array(20),
      payloadSize: 20,
      createdAt: Date.now(),
      expiresAt: Date.now() + 10000,
      isDelivered: false,
      deliveryStatus: 'pending',
      isProtected: false
    };

    storage.saveMessage(testMsg);
    expect(storage.getMessage(msgHex)?.isDelivered).toBe(false);

    // Recipient creates signed ACK
    const ackPacket = DeliveryReceipt.createSignedAck(
      originalMsgId,
      recipientKeys.privateKey,
      new Uint8Array(8),
      new Uint8Array(8),
      0x88654c5525fffff0n
    );

    // Sender receives and verifies ACK
    const result = DeliveryReceipt.processAck(ackPacket, storage, recipientKeys.publicKey);

    expect(result).not.toBeNull();
    expect(result?.isValid).toBe(true);
    expect(result?.originalMsgId).toBe(originalMsgId);

    // Status in storage must be updated to 🟢 delivered
    const updated = storage.getMessage(msgHex);
    expect(updated?.isDelivered).toBe(true);
    expect(updated?.deliveryStatus).toBe('delivered');
  });

  it('should reject forged ACK signed by an unauthorized key', () => {
    const storage = new SqliteStorageEngine();
    const legitimateRecipient = DigitalSignature.generateKeyPair();
    const imposter = DigitalSignature.generateKeyPair();

    const originalMsgId = 0x9988776655443322n;

    // Imposter signs the ACK
    const forgedAck = DeliveryReceipt.createSignedAck(
      originalMsgId,
      imposter.privateKey,
      new Uint8Array(8),
      new Uint8Array(8),
      0x88654c5525fffff0n
    );

    // Verification against legitimate recipient key must fail!
    const result = DeliveryReceipt.processAck(forgedAck, storage, legitimateRecipient.publicKey);
    expect(result?.isValid).toBe(false);
  });
});
