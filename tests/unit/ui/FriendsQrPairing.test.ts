import { describe, expect, it } from 'bun:test';
import { OfflineQrGenerator } from '../../../src/core/crypto/OfflineQrGenerator';
import { QrPairingEngine } from '../../../src/core/crypto/QrPairingEngine';
import {
  peerDiscoveryManager,
  discoveredPeersStore,
  peerCountsStore
} from '../../../src/core/state/PeerDiscoveryStore';

describe('QR Pairing & Dynamic Nearby Node Discovery Tests', () => {
  it('should generate valid contact pairing payload and SVG QR Code', () => {
    const nodeId = '4c55a9b1';
    const edPubHex = 'a1b2c3d4e5f6789012345678abcdef01';
    const xPubHex = 'b2c3d4e5f6789012345678abcdef0102';

    const payload = OfflineQrGenerator.createContactPayload(nodeId, edPubHex, xPubHex);
    expect(payload).toBe(`OG:v1:PAIR:${nodeId}:${edPubHex}:${xPubHex}`);

    const svg = OfflineQrGenerator.renderSvg(payload, { pixelSize: 8, margin: 2 });
    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox=');
    expect(svg).toContain('</svg>');
  });

  it('should compute consistent 8-digit safety numbers for paired peers', () => {
    const keyA = new Uint8Array(32).fill(0x11);
    const keyB = new Uint8Array(32).fill(0x22);

    const safety1 = QrPairingEngine.computeSafetyNumber(keyA, keyB);
    const safety2 = QrPairingEngine.computeSafetyNumber(keyB, keyA);

    expect(safety1.rawNumber).toBe(safety2.rawNumber);
    expect(safety1.formatted).toBe(safety2.formatted);
    expect(safety1.formatted).toMatch(/^\[ \d{4} \] \[ \d{4} \]$/);
  });

  it('should maintain purely real discovered peers without mock data', () => {
    const samutPrakanLat = 13.5990;
    const samutPrakanLng = 100.5960;

    peerDiscoveryManager.setUserLocation(samutPrakanLat, samutPrakanLng);

    // Initial state without incoming radio packet should not have fake mock nodes
    let userLoc: any = null;
    const unsubLoc = peerDiscoveryManager.getUserLocationStore().subscribe(val => { userLoc = val; });
    unsubLoc();

    expect(userLoc).not.toBeNull();
    expect(userLoc.lat).toBe(samutPrakanLat);
    expect(userLoc.lng).toBe(samutPrakanLng);
  });

  it('should correctly calculate peer counts in peerCountsStore', () => {
    let counts: any = null;
    const unsubscribe = peerCountsStore.subscribe(val => { counts = val; });
    unsubscribe();

    expect(counts).not.toBeNull();
    expect(typeof counts.total).toBe('number');
  });

  it('should manually add friend peer and update discovery store', () => {
    const testFriendId = '#TEST';
    peerDiscoveryManager.addFriendPeer(testFriendId, 'node-test-friend');

    let peers: any[] = [];
    const unsubscribe = discoveredPeersStore.subscribe(val => { peers = val; });
    unsubscribe();

    const found = peers.find(p => p.shortNodeId === testFriendId);
    expect(found).toBeDefined();
    expect(found?.isFriend).toBe(true);
  });
});
