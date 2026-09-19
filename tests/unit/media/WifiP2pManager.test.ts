/**
 * Unit tests for WifiP2pManager
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { WifiP2pManager, type IWifiP2pPeer } from '../../../src/core/media/WifiP2pManager';

describe('WifiP2pManager', () => {
  let p2p: WifiP2pManager;

  beforeEach(() => {
    p2p = new WifiP2pManager();
  });

  it('should register discovered peers correctly', () => {
    const peer: IWifiP2pPeer = {
      deviceAddress: 'AA:BB:CC:DD:EE:FF',
      deviceName: 'Rescue-Tablet-01',
      isGroupOwner: false,
      status: 'available',
    };
    p2p.registerDiscoveredPeer(peer);
    expect(p2p.getConnectedPeerCount()).toBe(0);
  });

  it('should negotiate Group Owner based on higher intent', () => {
    const peerAddress = 'AA:BB:CC:DD:EE:01';
    p2p.registerDiscoveredPeer({
      deviceAddress: peerAddress,
      deviceName: 'Peer-01',
      isGroupOwner: false,
      status: 'available',
    });

    // myIntent = 10 > peerIntent = 5 -> Local node becomes GO
    const ok = p2p.negotiateGroupOwner(peerAddress, 10, 5);
    expect(ok).toBe(true);
    expect(p2p.getIsGroupOwner()).toBe(true);
    expect(p2p.getGroupOwnerAddress()).toBe('192.168.49.1');
    expect(p2p.getConnectedPeerCount()).toBe(1);
  });

  it('should allow peer to become Group Owner when peer intent is higher', () => {
    const peerAddress = 'AA:BB:CC:DD:EE:02';
    p2p.registerDiscoveredPeer({
      deviceAddress: peerAddress,
      deviceName: 'Peer-02',
      isGroupOwner: false,
      status: 'available',
    });

    // myIntent = 3 < peerIntent = 12 -> Remote peer becomes GO
    const ok = p2p.negotiateGroupOwner(peerAddress, 3, 12);
    expect(ok).toBe(true);
    expect(p2p.getIsGroupOwner()).toBe(false);
    expect(p2p.getGroupOwnerAddress()).toBe('192.168.49.1');
    expect(p2p.getConnectedPeerCount()).toBe(1);
  });

  it('should handle disconnect and reset states', () => {
    const peerAddress = 'AA:BB:CC:DD:EE:03';
    p2p.registerDiscoveredPeer({
      deviceAddress: peerAddress,
      deviceName: 'Peer-03',
      isGroupOwner: false,
      status: 'available',
    });

    p2p.negotiateGroupOwner(peerAddress, 8, 4);
    expect(p2p.getConnectedPeerCount()).toBe(1);

    p2p.disconnect();
    expect(p2p.getConnectedPeerCount()).toBe(0);
    expect(p2p.getIsGroupOwner()).toBe(false);
    expect(p2p.getGroupOwnerAddress()).toBeNull();
  });
});
