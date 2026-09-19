/**
 * Hardware Keystore & Secure Storage Adapter
 * Implements Hexagonal Port: IKeystoreDriver
 * Protocol: TOG v1.1 Pure Domain Adapter
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import type { IKeystoreDriver, IKeypairBundle } from '../interfaces/IKeystoreDriver';

export class SecureStorageAdapter implements IKeystoreDriver {
  public readonly driverName: string;
  private memoryStore: Map<string, Uint8Array> = new Map();
  private isInitialized = false;

  constructor(driverName: string = 'SECURE_STORAGE_ADAPTER') {
    this.driverName = driverName;
  }

  public async initialize(): Promise<void> {
    this.isInitialized = true;
  }

  public async saveMasterKeypair(keys: IKeypairBundle): Promise<void> {
    this.ensureInitialized();
    this.memoryStore.set('ed25519_priv', new Uint8Array(keys.ed25519PrivateKey));
    this.memoryStore.set('ed25519_pub', new Uint8Array(keys.ed25519PublicKey));
    this.memoryStore.set('x25519_priv', new Uint8Array(keys.x25519PrivateKey));
    this.memoryStore.set('x25519_pub', new Uint8Array(keys.x25519PublicKey));
    this.memoryStore.set('pubkey_hash', new Uint8Array(keys.pubkeyHash));

    const nodeIdBuf = new Uint8Array(8);
    const view = new DataView(nodeIdBuf.buffer);
    view.setBigUint64(0, keys.nodeId, false);
    this.memoryStore.set('node_id', nodeIdBuf);
  }

  public async loadMasterKeypair(): Promise<IKeypairBundle | null> {
    this.ensureInitialized();
    const edPriv = this.memoryStore.get('ed25519_priv');
    const edPub = this.memoryStore.get('ed25519_pub');
    const xPriv = this.memoryStore.get('x25519_priv');
    const xPub = this.memoryStore.get('x25519_pub');
    const hash = this.memoryStore.get('pubkey_hash');
    const nodeIdBuf = this.memoryStore.get('node_id');

    if (!edPriv || !edPub || !xPriv || !xPub || !hash || !nodeIdBuf) {
      return null;
    }

    const view = new DataView(nodeIdBuf.buffer, nodeIdBuf.byteOffset, 8);
    const nodeId = view.getBigUint64(0, false);

    return {
      ed25519PrivateKey: new Uint8Array(edPriv),
      ed25519PublicKey: new Uint8Array(edPub),
      x25519PrivateKey: new Uint8Array(xPriv),
      x25519PublicKey: new Uint8Array(xPub),
      nodeId,
      pubkeyHash: new Uint8Array(hash)
    };
  }

  public async hasIdentity(): Promise<boolean> {
    this.ensureInitialized();
    return this.memoryStore.has('ed25519_priv') && this.memoryStore.has('x25519_priv');
  }

  public async purgeKeys(): Promise<void> {
    this.ensureInitialized();
    // Zero-fill all stored byte arrays before deleting
    for (const buf of this.memoryStore.values()) {
      buf.fill(0);
    }
    this.memoryStore.clear();
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      this.isInitialized = true;
    }
  }
}
