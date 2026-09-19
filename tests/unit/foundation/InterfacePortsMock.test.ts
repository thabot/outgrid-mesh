import { describe, it, expect } from 'bun:test';
import type { IRadioDriver, IRadioTransmissionResult, RadioPacketCallback } from '@core/interfaces/IRadioDriver';
import type { IStorageDriver, IStoredMessage, IPeerContact } from '@core/interfaces/IStorageDriver';
import type { IKeystoreDriver, IKeypairBundle } from '@core/interfaces/IKeystoreDriver';
import type { IGpsDriver, IGpsCoordinates, GpsUpdateCallback } from '@core/interfaces/IGpsDriver';

/**
 * Mock implementations of hexagonal ports for dependency injection and testing
 */
class MockRadioDriver implements IRadioDriver {
  public readonly driverName = 'MOCK_RADIO';
  public isPowered = false;
  public sentPackets: Uint8Array[] = [];
  public receiveCallback: RadioPacketCallback | null = null;

  async initialize(): Promise<boolean> {
    this.isPowered = true;
    return true;
  }
  async startReceiving(cb: RadioPacketCallback): Promise<void> {
    this.receiveCallback = cb;
  }
  async stopReceiving(): Promise<void> {
    this.receiveCallback = null;
  }
  async broadcastPacket(data: Uint8Array): Promise<IRadioTransmissionResult> {
    this.sentPackets.push(data);
    return { success: true, bytesSent: data.length };
  }
  isAvailable(): boolean {
    return this.isPowered;
  }
  async destroy(): Promise<void> {
    this.isPowered = false;
  }
}

class MockStorageDriver implements IStorageDriver {
  public readonly driverName = 'IN_MEMORY_MOCK';
  private messages = new Map<string, IStoredMessage>();
  private peers = new Map<string, IPeerContact>();

  async initialize(): Promise<void> {}
  async saveMessage(msg: IStoredMessage): Promise<void> {
    this.messages.set(msg.id, msg);
  }
  async getMessage(id: string): Promise<IStoredMessage | null> {
    return this.messages.get(id) || null;
  }
  async getMessages(recipientHash?: string): Promise<IStoredMessage[]> {
    const all = Array.from(this.messages.values());
    return recipientHash ? all.filter(m => m.recipientHash === recipientHash) : all;
  }
  async savePeer(peer: IPeerContact): Promise<void> {
    this.peers.set(peer.pubkeyHash, peer);
  }
  async getPeer(pubkeyHash: string): Promise<IPeerContact | null> {
    return this.peers.get(pubkeyHash) || null;
  }
  async getAllPeers(): Promise<IPeerContact[]> {
    return Array.from(this.peers.values());
  }
  async enforceQuota(): Promise<{ evictedCount: number; currentBytes: number }> {
    return { evictedCount: 0, currentBytes: 1024 };
  }
  async getStorageUsageBytes(): Promise<number> {
    return 1024;
  }
  async close(): Promise<void> {}
}

class MockKeystoreDriver implements IKeystoreDriver {
  public readonly driverName = 'MOCK_KEYSTORE';
  private keys: IKeypairBundle | null = null;

  async initialize(): Promise<void> {}
  async saveMasterKeypair(k: IKeypairBundle): Promise<void> {
    this.keys = k;
  }
  async loadMasterKeypair(): Promise<IKeypairBundle | null> {
    return this.keys;
  }
  async hasIdentity(): Promise<boolean> {
    return this.keys !== null;
  }
  async purgeKeys(): Promise<void> {
    this.keys = null;
  }
}

class MockGpsDriver implements IGpsDriver {
  public readonly driverName = 'MOCK_GPS';
  public isReady = false;

  async initialize(): Promise<boolean> {
    this.isReady = true;
    return true;
  }
  async getCurrentPosition(): Promise<IGpsCoordinates> {
    return {
      latitude: 13.7563,
      longitude: 100.5018,
      accuracyMeters: 3.5,
      timestamp: Date.now()
    };
  }
  async startTracking(cb: GpsUpdateCallback): Promise<void> {
    cb(await this.getCurrentPosition());
  }
  async stopTracking(): Promise<void> {}
  isAvailable(): boolean {
    return this.isReady;
  }
}

describe('InterfacePortsMock (Phase 1 Task 1.5.2)', () => {
  it('should satisfy IRadioDriver contract and support simulated transmission', async () => {
    const radio = new MockRadioDriver();
    expect(await radio.initialize()).toBe(true);
    expect(radio.isAvailable()).toBe(true);

    const payload = new Uint8Array([0x54, 0x4F, 0x47, 0x31]);
    const res = await radio.broadcastPacket(payload);
    expect(res.success).toBe(true);
    expect(radio.sentPackets).toHaveLength(1);
  });

  it('should satisfy IStorageDriver contract and persist messages and peers', async () => {
    const storage = new MockStorageDriver();
    await storage.initialize();

    const msg: IStoredMessage = {
      id: 'msg_001',
      type: 1,
      senderHash: 'sender_abc',
      recipientHash: 'recip_xyz',
      payload: new Uint8Array([1, 2, 3]),
      status: 'SENT',
      timestamp: Date.now(),
      ttl: 7,
      hops: 1,
      isEmergency: true
    };

    await storage.saveMessage(msg);
    const retrieved = await storage.getMessage('msg_001');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.isEmergency).toBe(true);
  });

  it('should satisfy IKeystoreDriver contract and store/retrieve master identity bundle', async () => {
    const keystore = new MockKeystoreDriver();
    expect(await keystore.hasIdentity()).toBe(false);

    const bundle: IKeypairBundle = {
      ed25519PrivateKey: new Uint8Array(32),
      ed25519PublicKey: new Uint8Array(32),
      x25519PrivateKey: new Uint8Array(32),
      x25519PublicKey: new Uint8Array(32),
      nodeId: 123456789n,
      pubkeyHash: new Uint8Array(8)
    };

    await keystore.saveMasterKeypair(bundle);
    expect(await keystore.hasIdentity()).toBe(true);
    const loaded = await keystore.loadMasterKeypair();
    expect(loaded?.nodeId).toBe(123456789n);
  });

  it('should satisfy IGpsDriver contract and provide mock coordinates', async () => {
    const gps = new MockGpsDriver();
    await gps.initialize();
    const pos = await gps.getCurrentPosition();
    expect(pos.latitude).toBeCloseTo(13.7563, 4);
    expect(pos.longitude).toBeCloseTo(100.5018, 4);
  });
});
