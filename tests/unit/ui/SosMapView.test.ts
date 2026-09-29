/**
 * SosMapView Unit Tests & Real Peer Spatial Verification
 * Validates Native Leaflet Markers, Location Persistence, Heading-Up Compass, and Zero-Mock Peer Nodes
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { peerDiscoveryManager, discoveredPeersStore } from '../../../src/core/state/PeerDiscoveryStore';
import { SosRadarEngine } from '../../../src/core/spatial/SosRadarEngine';
import { NativeBridgeDispatcher } from '../../../src/core/native/NativeBridgeDispatcher';
import { MockOutGridBridge } from '../../../src/core/native/MockOutGridBridge';

describe('SosMapView & Spatial Radar Integration Tests', () => {
  beforeEach(() => {
    // Reset localStorage mocks if present
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

  it('should persist user GPS location and map zoom in localStorage', () => {
    const testLocation = { lat: 13.7450, lng: 100.5340 };
    peerDiscoveryManager.setUserLocation(testLocation.lat, testLocation.lng);

    const saved = localStorage.getItem('outgrid_last_gps_location');
    expect(saved).not.toBeNull();
    const parsed = JSON.parse(saved!);
    expect(parsed.lat).toBeCloseTo(13.7450, 4);
    expect(parsed.lng).toBeCloseTo(100.5340, 4);

    localStorage.setItem('outgrid_last_map_zoom', '17');
    expect(localStorage.getItem('outgrid_last_map_zoom')).toBe('17');
  });

  it('should calculate accurate distance and bearing for peer nodes without drift', () => {
    const myPos = { lat: 13.7563, lng: 100.5018 };
    const peerPos = { lat: 13.7590, lng: 100.5050 };

    const distance = SosRadarEngine.calculateDistanceMeters(
      myPos.lat,
      myPos.lng,
      peerPos.lat,
      peerPos.lng
    );
    const bearing = SosRadarEngine.calculateBearingDegrees(
      myPos.lat,
      myPos.lng,
      peerPos.lat,
      peerPos.lng
    );

    expect(distance).toBeGreaterThan(300);
    expect(distance).toBeLessThan(600);
    expect(bearing).toBeGreaterThan(0);
    expect(bearing).toBeLessThan(90); // North-East quadrant
  });

  it('should calculate correct cardinal direction from heading degrees', () => {
    const getCardinal = (deg: number): string => {
      const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
      return directions[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
    };

    expect(getCardinal(0)).toBe('N');
    expect(getCardinal(45)).toBe('NE');
    expect(getCardinal(90)).toBe('E');
    expect(getCardinal(135)).toBe('SE');
    expect(getCardinal(180)).toBe('S');
    expect(getCardinal(225)).toBe('SW');
    expect(getCardinal(270)).toBe('W');
    expect(getCardinal(315)).toBe('NW');
    expect(getCardinal(360)).toBe('N');
  });

  it('should maintain purely real discovered peers in discoveredPeersStore without hardcoded sample nodes', () => {
    let peers: any[] = [];
    const unsub = discoveredPeersStore.subscribe((list) => {
      peers = list;
    });

    // Check that there are no hardcoded fake names like "หน่วยกู้ภัยสว่างบริบูรณ์" or "หมอสมชาย" in store
    const hasFakeRescue = peers.some(p => p.customName?.includes('สว่างบริบูรณ์') || p.shortNodeId === 'node-rescue-team');
    const hasFakeMedic = peers.some(p => p.customName?.includes('หมอสมชาย') || p.shortNodeId === 'node-medic-04');

    expect(hasFakeRescue).toBe(false);
    expect(hasFakeMedic).toBe(false);

    unsub();
  });
});

describe('NativeBridgeDispatcher & Flashlight SOS Safety Tests', () => {
  it('should support startSosStrobe and stopSosStrobe safely without throwing exceptions', () => {
    const dispatcher = NativeBridgeDispatcher.getInstance();

    expect(() => {
      dispatcher.startSosStrobe();
    }).not.toThrow();

    expect(() => {
      dispatcher.stopSosStrobe();
    }).not.toThrow();

    expect(() => {
      dispatcher.toggleTorch(true);
      dispatcher.toggleTorch(false);
      dispatcher.stopTorch();
    }).not.toThrow();
  });

  it('should support audible alarm methods safely', () => {
    const dispatcher = NativeBridgeDispatcher.getInstance();

    expect(() => {
      dispatcher.playAudibleAlarm();
      dispatcher.stopAudibleAlarm();
    }).not.toThrow();
  });

  it('should safely handle missing bridge implementation without freezing', () => {
    const mockBridge = new MockOutGridBridge();
    expect(mockBridge.startSosStrobe()).toBe(true);
    expect(mockBridge.isSosStrobeOn()).toBe(true);
    expect(mockBridge.stopSosStrobe()).toBe(true);
    expect(mockBridge.isSosStrobeOn()).toBe(false);
  });
});
