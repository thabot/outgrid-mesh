/**
 * Hexagonal Port: Keystore Driver Interface
 * Protocol: TOG v1.1 Pure Domain Port
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export interface IKeypairBundle {
  ed25519PrivateKey: Uint8Array;
  ed25519PublicKey: Uint8Array;
  x25519PrivateKey: Uint8Array;
  x25519PublicKey: Uint8Array;
  nodeId: bigint;
  pubkeyHash: Uint8Array;
}

export interface IKeystoreDriver {
  /** Driver identifier (e.g., 'ANDROID_TEE_KEYSTORE', 'WEB_CRYPTO_SUBTLE', 'MOCK_KEYSTORE') */
  readonly driverName: string;

  /** Initialize the secure keystore runtime */
  initialize(): Promise<void>;

  /** Securely save the master identity keypair */
  saveMasterKeypair(keys: IKeypairBundle): Promise<void>;

  /** Retrieve the master identity keypair if exists */
  loadMasterKeypair(): Promise<IKeypairBundle | null>;

  /** Check if a valid hardware-backed identity exists */
  hasIdentity(): Promise<boolean>;

  /** Purge keys securely from storage */
  purgeKeys(): Promise<void>;
}
