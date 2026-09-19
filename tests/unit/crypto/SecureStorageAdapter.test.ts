/**
 * Unit tests for SecureStorageAdapter (Phase 3 Task 3.4)
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, expect, it, beforeEach } from 'bun:test';
import { SecureStorageAdapter } from '../../../src/core/crypto/SecureStorageAdapter';
import { KeyManager } from '../../../src/core/crypto/KeyManager';

describe('SecureStorageAdapter (Phase 3 Task 3.4 Hardware Keystore Port Adapter)', () => {
  let adapter: SecureStorageAdapter;

  beforeEach(async () => {
    adapter = new SecureStorageAdapter('TEST_TEE_ADAPTER');
    await adapter.initialize();
  });

  it('should initialize and report no identity initially', async () => {
    expect(adapter.driverName).toBe('TEST_TEE_ADAPTER');
    expect(await adapter.hasIdentity()).toBe(false);
    expect(await adapter.loadMasterKeypair()).toBeNull();
  });

  it('should save and retrieve master identity keypair correctly', async () => {
    const keys = KeyManager.generateMasterIdentity();
    await adapter.saveMasterKeypair(keys);

    expect(await adapter.hasIdentity()).toBe(true);

    const loaded = await adapter.loadMasterKeypair();
    expect(loaded).not.toBeNull();
    expect(Array.from(loaded!.ed25519PrivateKey)).toEqual(Array.from(keys.ed25519PrivateKey));
    expect(Array.from(loaded!.ed25519PublicKey)).toEqual(Array.from(keys.ed25519PublicKey));
    expect(Array.from(loaded!.x25519PrivateKey)).toEqual(Array.from(keys.x25519PrivateKey));
    expect(Array.from(loaded!.x25519PublicKey)).toEqual(Array.from(keys.x25519PublicKey));
    expect(loaded!.nodeId).toBe(keys.nodeId);
    expect(Array.from(loaded!.pubkeyHash)).toEqual(Array.from(keys.pubkeyHash));
  });

  it('should securely purge stored keys with memory wipe', async () => {
    const keys = KeyManager.generateMasterIdentity();
    await adapter.saveMasterKeypair(keys);
    expect(await adapter.hasIdentity()).toBe(true);

    await adapter.purgeKeys();
    expect(await adapter.hasIdentity()).toBe(false);
    expect(await adapter.loadMasterKeypair()).toBeNull();
  });
});
