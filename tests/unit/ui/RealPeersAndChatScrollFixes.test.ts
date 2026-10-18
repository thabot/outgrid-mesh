/**
 * Unit Tests for Zero-Mock Real Map Peers, Chat Auto-Scroll, and Offline BLE Transmission
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { peerDiscoveryManager, discoveredPeersStore } from '../../../src/core/state/PeerDiscoveryStore';
import { get } from 'svelte/store';
import fs from 'node:fs';
import path from 'node:path';

describe('Zero-Mock Real Map Peers, Chat Auto-Scroll & Offline BLE Verification', () => {
  beforeEach(() => {
    if (typeof globalThis !== 'undefined') {
      const mockStorage: Record<string, string> = {};
      (globalThis as any).localStorage = {
        getItem: (k: string) => mockStorage[k] || null,
        setItem: (k: string, v: string) => { mockStorage[k] = v; },
        removeItem: (k: string) => { delete mockStorage[k]; },
        clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
      };
    }
  });

  it('should strictly reject mock nodes from being added to peerDiscoveryManager', () => {
    peerDiscoveryManager.addFriendPeer('node-rescue-team');
    peerDiscoveryManager.addFriendPeer('node-medic-04');
    peerDiscoveryManager.addFriendPeer('node-peer');

    const peers = get(discoveredPeersStore);
    const hasMock = peers.some(p => p.shortNodeId.startsWith('node-') || p.shortNodeId.includes('rescue'));
    expect(hasMock).toBe(false);
  });

  it('should mark manually added friends with hasRealSignal: false until radio presence is detected', () => {
    peerDiscoveryManager.addFriendPeer('#5D72');

    const peers = get(discoveredPeersStore);
    const friend = peers.find(p => p.shortNodeId === '#5D72');
    expect(friend).toBeDefined();
    expect(friend?.isFriend).toBe(true);
    expect(friend?.hasRealSignal).toBe(false);
  });

  it('should purge legacy mock nodes from localStorage on loadPersistedPeers', () => {
    const fakeList = [
      { shortNodeId: 'node-rescue-team', lat: 13.75, lng: 100.5, batteryBars: 5, rssiTier: 3, distanceMeters: 30, lastSeen: Date.now() },
      { shortNodeId: '#7D9E', lat: 13.75, lng: 100.5, batteryBars: 4, rssiTier: 2, distanceMeters: 16, lastSeen: Date.now(), hasRealSignal: true }
    ];
    localStorage.setItem('outgrid_persisted_peers_v1', JSON.stringify(fakeList));

    peerDiscoveryManager.loadPersistedPeers();

    const peers = get(discoveredPeersStore);
    expect(peers.some(p => p.shortNodeId === 'node-rescue-team')).toBe(false);
    expect(peers.some(p => p.shortNodeId === '#7D9E')).toBe(true);
  });

  it('should verify MeshChatScreen has direct and broadcast scroll containers and auto-scroll logic', () => {
    const sveltePath = path.resolve('src/ui/components/MeshChatScreen.svelte');
    const content = fs.readFileSync(sveltePath, 'utf-8');

    expect(content).toContain('bind:this={directScrollContainer}');
    expect(content).toContain('bind:this={broadcastScrollContainer}');
    expect(content).toContain('async function scrollToBottom');
    expect(content).toContain('directScrollContainer.scrollTop = directScrollContainer.scrollHeight');
  });

  it('should verify BleRadioNativeDriver has legacy scanning enabled and open fallback filter', () => {
    const driverPath = path.resolve('android/app/src/main/java/io/outgrid/mesh/BleRadioNativeDriver.kt');
    const content = fs.readFileSync(driverPath, 'utf-8');

    expect(content).toContain('.setLegacy(true)');
    expect(content).toContain('ScanFilter.Builder().build()');
  });
});
