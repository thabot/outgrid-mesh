import { describe, expect, it } from 'bun:test';
import { AuthManager } from '../../../src/core/auth/AuthManager';
import {
  peerDiscoveryManager,
  discoveredPeersStore
} from '../../../src/core/state/PeerDiscoveryStore';
import { NativeBridgeDispatcher } from '../../../src/core/native/NativeBridgeDispatcher';
import { OneTapSosEngine, SosStatusCategory } from '../../../src/core/state/OneTapSosEngine';

describe('Deep Dive Bug Fixes & Handshake Integration Tests', () => {
  it('should maintain deterministic and persistent Node ID across multiple AuthManager instances', () => {
    const auth1 = new AuthManager();
    const prof1 = auth1.getProfile();

    const auth2 = new AuthManager();
    const prof2 = auth2.getProfile();

    // Node ID must not drift or regenerate randomly
    expect(prof1.nodeId).toBe(prof2.nodeId);
    expect(prof1.nodeId.length).toBeGreaterThanOrEqual(8);
  });

  it('should update and persist user display name correctly', () => {
    const auth = new AuthManager();
    const testName = 'หัวหน้าทีมกู้ภัย 01';
    auth.updateDisplayName(testName);

    expect(auth.getProfile().displayName).toBe(testName);

    // Verify next instance reads the updated display name
    const authNext = new AuthManager();
    expect(authNext.getProfile().displayName).toBe(testName);
  });

  it('should support Two-Way QR Pairing Handshake via BLE radio packet', () => {
    const myAuth = new AuthManager();
    const myProfile = myAuth.getProfile();

    // Prepare simulated peer B
    const peerB_NodeId = '9F88B1C2';
    const peerB_ShortId = '#9F88';
    const peerB_Name = 'อาสาฉุกเฉินสมศักดิ์';

    // Simulate Machine B receiving Machine A's pairing ACK packet over radio
    const handshakePayload = `OG:v1:PAIR_ACK:${myProfile.nodeId.slice(0, 8)}:${peerB_NodeId}:${encodeURIComponent(peerB_Name)}:11223344:55667788`;
    const encoder = new TextEncoder();
    const packetBytes = encoder.encode(handshakePayload);

    // Trigger packet via dispatcher
    let receivedPayloadText = '';
    const unsub = NativeBridgeDispatcher.getInstance().subscribeToPackets((ev) => {
      receivedPayloadText = new TextDecoder().decode(ev.bytes);
    });

    const base64 = Buffer.from(packetBytes).toString('base64');
    (globalThis as any).OutGridMesh?.receiveNativePacket?.(base64, -65);

    unsub();

    expect(receivedPayloadText).toBe(handshakePayload);
    expect(receivedPayloadText).toContain('OG:v1:PAIR_ACK:');
    expect(receivedPayloadText).toContain(peerB_NodeId);
  });

  it('should trigger One-Tap SOS radio broadcast with active GPS coordinates and battery level', () => {
    const lat = 13.7563;
    const lng = 100.5018;
    const category = SosStatusCategory.GENERAL_EMERGENCY;

    const sosBeacon = OneTapSosEngine.createSosBeacon({
      lat,
      lng,
      batteryLevel: 95,
      category,
      senderPubkeyHash: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])
    });

    expect(sosBeacon).toBeDefined();
    expect(sosBeacon.payload.length).toBe(6);

    const dispatcher = NativeBridgeDispatcher.getInstance();
    const txSuccess = dispatcher.transmitRadioPacket(sosBeacon.payload, true);
    expect(txSuccess).toBe(true);
  });

  it('should correctly register and display nearby radio peers without requiring friendship pairing', () => {
    const radioNodeShortId = '#88AA';
    peerDiscoveryManager.addFriendPeer(radioNodeShortId, 'node-88aa-full');

    let peers: any[] = [];
    const unsub = discoveredPeersStore.subscribe(val => { peers = val; });
    unsub();

    const node = peers.find(p => p.shortNodeId === radioNodeShortId);
    expect(node).toBeDefined();
    expect(node?.distanceMeters).toBeGreaterThan(0);
    expect(node?.batteryBars).toBeGreaterThanOrEqual(1);
  });
});
