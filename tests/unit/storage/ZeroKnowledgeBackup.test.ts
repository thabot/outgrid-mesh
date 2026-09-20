/**
 * Unit tests for ZeroKnowledgeBackup & 50MB FIFO Ceiling (Sprint F Task F.6)
 * Verifies client-side encrypted backup blob, SOS-protected 50MB FIFO eviction, and Guest Parity
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Zero-Knowledge Privacy & Storage Ceiling
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, it, expect } from 'bun:test';
import { SqliteStorageEngine } from '../../../src/core/storage/SqliteStorageEngine';
import { type IStoredMessage } from '../../../src/core/storage/schema';
import { CryptoEngine } from '../../../src/core/crypto/CryptoEngine';
import { AuthManager, UserRole } from '../../../src/core/auth/AuthManager';

describe('ZeroKnowledgeBackup (Sprint F Task F.6 Zero-Knowledge Backup & Storage Parity)', () => {
  it('should encrypt contact backup blob client-side so server cannot read plaintext', () => {
    const userMasterKey = CryptoEngine.generateKeyPair();
    const serverKey = CryptoEngine.generateKeyPair();
    const mockContacts = [
      { alias: 'Doctor Somchai', pubkeyHash: '01a2b3c4', verified: true },
      { alias: 'Rescue Center 1', pubkeyHash: '05e6f7a8', verified: true },
    ];

    const plaintextBlob = new TextEncoder().encode(JSON.stringify(mockContacts));

    // Client derives symmetric key using master identity
    const sessionKey = CryptoEngine.deriveSessionKey(userMasterKey.privateKey, userMasterKey.publicKey);
    const encryptedBlob = CryptoEngine.encrypt(plaintextBlob, sessionKey);

    // Assert ciphertext does NOT contain plaintext substrings
    const rawCiphertextString = new TextDecoder().decode(encryptedBlob);
    expect(rawCiphertextString.includes('Doctor Somchai')).toBe(false);
    expect(rawCiphertextString.includes('Rescue Center 1')).toBe(false);

    // Client decrypts with same key upon restore
    const decryptedBytes = CryptoEngine.decrypt(encryptedBlob, sessionKey);
    const restoredContacts = JSON.parse(new TextDecoder().decode(decryptedBytes));

    expect(restoredContacts.length).toBe(2);
    expect(restoredContacts[0].alias).toBe('Doctor Somchai');
  });

  it('should enforce 50MB storage ceiling and strictly protect SOS messages from FIFO eviction', () => {
    const smallCeilingEngine = new SqliteStorageEngine(1000); // 1,000 bytes budget

    // Add normal chat messages (400 bytes each)
    const chat1: IStoredMessage = {
      id: 'chat-1',
      packetType: 0x02,
      priority: 0x8,
      senderHash: '0102030405060708',
      recipientHash: '0807060504030201',
      targetH3Index: '881f1d4887fffff',
      payload: new Uint8Array(400),
      payloadSize: 400,
      createdAt: 1000,
      expiresAt: 5000,
      isDelivered: true,
      deliveryStatus: 'delivered',
      isProtected: false,
    };

    const sosMsg: IStoredMessage = {
      id: 'sos-1',
      packetType: 0x01,
      priority: 0xf,
      senderHash: '0102030405060708',
      recipientHash: 'ffffffffffffffff',
      targetH3Index: '881f1d4887fffff',
      payload: new Uint8Array(400),
      payloadSize: 400,
      createdAt: 2000,
      expiresAt: 99999,
      isDelivered: false,
      deliveryStatus: 'pending',
      isProtected: true, // SOS IS LOCKED
    };

    const chat2: IStoredMessage = {
      id: 'chat-2',
      packetType: 0x02,
      priority: 0x8,
      senderHash: '0102030405060708',
      recipientHash: '0807060504030201',
      targetH3Index: '881f1d4887fffff',
      payload: new Uint8Array(400),
      payloadSize: 400,
      createdAt: 3000,
      expiresAt: 7000,
      isDelivered: true,
      deliveryStatus: 'delivered',
      isProtected: false,
    };

    smallCeilingEngine.saveMessage(chat1);
    smallCeilingEngine.saveMessage(sosMsg);
    // Capacity now 800/1000 bytes. Adding chat2 (400 bytes) will exceed 1000 bytes -> Evicts oldest un-protected (chat1)
    smallCeilingEngine.saveMessage(chat2);

    expect(smallCeilingEngine.getMessage('chat-1')).toBeUndefined(); // chat1 was evicted
    expect(smallCeilingEngine.getMessage('sos-1')).toBeDefined();    // SOS message is preserved!
    expect(smallCeilingEngine.getMessage('chat-2')).toBeDefined();
  });

  it('should guarantee 100% emergency capability for Guest users without authentication token', () => {
    const auth = new AuthManager();
    const guestProfile = auth.getProfile();

    expect(guestProfile.role).toBe(UserRole.GUEST_VICTIM);
    expect(auth.isGuest()).toBe(true);

    // Guest has full emergency life-saving capability
    expect(auth.canAccessFeature('ONE_TAP_SOS')).toBe(true);
    expect(auth.canAccessFeature('OFFLINE_MAP')).toBe(true);
    expect(auth.canAccessFeature('DIRECT_CHAT')).toBe(true);

    // Administrative dashboard requires verified responder
    expect(auth.canAccessFeature('COORDINATION_DASHBOARD')).toBe(false);
  });
});
