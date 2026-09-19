/**
 * Unit tests for KeyManager (Phase 3 Task 3.1)
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, expect, it } from 'bun:test';
import { KeyManager } from '../../../src/core/crypto/KeyManager';

describe('KeyManager (Phase 3 Task 3.1 Identity Keypair Engine)', () => {
  it('should generate a full master identity bundle with 32B Ed25519 and X25519 keys', () => {
    const bundle = KeyManager.generateMasterIdentity();

    expect(bundle.ed25519PrivateKey.length).toBe(32);
    expect(bundle.ed25519PublicKey.length).toBe(32);
    expect(bundle.x25519PrivateKey.length).toBe(32);
    expect(bundle.x25519PublicKey.length).toBe(32);
    expect(bundle.pubkeyHash.length).toBe(8);
    expect(typeof bundle.nodeId).toBe('bigint');
    expect(bundle.nodeId).toBeGreaterThan(0n);
  });

  it('should compute consistent 8-byte key hash and uint64 node ID', () => {
    const bundle = KeyManager.generateMasterIdentity();
    const computedHash = KeyManager.computeKeyHash(bundle.ed25519PublicKey);
    const computedNodeId = KeyManager.computeNodeId(bundle.ed25519PublicKey);

    expect(Array.from(computedHash)).toEqual(Array.from(bundle.pubkeyHash));
    expect(computedNodeId).toBe(bundle.nodeId);
  });

  it('should reconstitute keypair bundle from imported raw private keys', () => {
    const original = KeyManager.generateMasterIdentity();
    const imported = KeyManager.importFromPrivateKeys(
      original.ed25519PrivateKey,
      original.x25519PrivateKey
    );

    expect(Array.from(imported.ed25519PublicKey)).toEqual(Array.from(original.ed25519PublicKey));
    expect(Array.from(imported.x25519PublicKey)).toEqual(Array.from(original.x25519PublicKey));
    expect(imported.nodeId).toBe(original.nodeId);
    expect(Array.from(imported.pubkeyHash)).toEqual(Array.from(original.pubkeyHash));
  });

  it('should reject invalid private key lengths on import', () => {
    const invalidShort = new Uint8Array(16);
    const validKey = new Uint8Array(32);

    expect(() => KeyManager.importFromPrivateKeys(invalidShort, validKey)).toThrow('Invalid Ed25519 private key length');
    expect(() => KeyManager.importFromPrivateKeys(validKey, invalidShort)).toThrow('Invalid X25519 private key length');
  });
});
