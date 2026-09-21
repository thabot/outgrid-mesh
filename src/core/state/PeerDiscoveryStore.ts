/**
 * Dynamic Peer Discovery Store & Automated Presence Beacon Service
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Master Project Plan v6.1 Phase 7 (BLE) & Spatial Presence
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { writable, derived } from 'svelte/store';
import { NativeBridgeDispatcher } from '../native/NativeBridgeDispatcher';
import { TOGPacketType, type IPresenceChirp } from '../protocol/TOGPacket';
import { PacketSerializer } from '../protocol/PacketSerializer';
import { H3GridEngine } from '../spatial/H3GridEngine';

export interface IDiscoveredPeer {
  shortNodeId: string;       // e.g. "#4C55"
  fullNodeId?: string;
  lat: number;
  lng: number;
  batteryBars: number;       // 1 to 5 bars
  rssiTier: number;          // 0 to 3 (0=Weak, 1=Med, 2=Good, 3=Strong)
  distanceMeters: number;    // Estimated distance
  lastSeen: number;          // Timestamp in ms
  isFriend?: boolean;
  isRelay?: boolean;
  isGateway?: boolean;
  isSos?: boolean;
}

export interface IPeerCounts {
  sos: number;
  friends: number;
  relays: number;
  gateways: number;
  total: number;
}

export class PeerDiscoveryStoreManager {
  private peersStore = writable<Map<string, IDiscoveredPeer>>(new Map());
  private userLocationStore = writable<{ lat: number; lng: number } | null>(null);
  private beaconIntervalId: any = null;
  private isBroadcasting = false;
  private dispatcher = NativeBridgeDispatcher.getInstance();
  private unsubscribePacket: (() => void) | null = null;

  constructor() {
    this.initPacketListener();
  }

  private initPacketListener() {
    this.unsubscribePacket = this.dispatcher.subscribeToPackets((event) => {
      try {
        this.processIncomingPacket(event.bytes, event.rssi);
      } catch (err) {
        // Silently skip corrupted radio packets
      }
    });
  }

  /**
   * Updates user's current GPS location
   */
  public setUserLocation(lat: number, lng: number) {
    this.userLocationStore.set({ lat, lng });
  }

  /**
   * Processes raw TOG radio bytes received from native BLE
   */
  public processIncomingPacket(bytes: Uint8Array, rssiDbm: number) {
    if (bytes.length < 2) return;

    // Check TOG Magic (0x54, 0x4F)
    if (bytes[0] === 0x54 && bytes[1] === 0x4F) {
      if (bytes.length >= 5) {
        const pType = bytes[2] & 0x1f;
        if (pType === TOGPacketType.PRESENCE_CHIRP) {
          try {
            const chirp = PacketSerializer.deserializePresenceChirp(bytes.slice(5));
            this.handlePresenceChirp(chirp, rssiDbm);
            return;
          } catch {
            // Try deserialize directly below
          }
        }
      }
    }

    // Direct 27-byte Presence Chirp
    if (bytes.length >= 27) {
      try {
        const chirp = PacketSerializer.deserializePresenceChirp(bytes);
        this.handlePresenceChirp(chirp, rssiDbm);
      } catch {
        // Not a valid chirp
      }
    }
  }

  private handlePresenceChirp(chirp: IPresenceChirp, rssiDbm: number) {
    const hexId = chirp.ourShortNodeId.toString(16).toUpperCase().padStart(4, '0').slice(-4);
    const shortNodeId = `#${hexId}`;

    let rssiTier = 1;
    if (rssiDbm > -60) rssiTier = 3;
    else if (rssiDbm > -75) rssiTier = 2;
    else if (rssiDbm > -85) rssiTier = 1;
    else rssiTier = 0;

    const measuredPower = -59;
    const n = 2.5;
    let distanceMeters = Math.round(Math.pow(10, (measuredPower - rssiDbm) / (10 * n)));
    distanceMeters = Math.max(5, Math.min(1000, distanceMeters));

    let lat = 13.7563;
    let lng = 100.5018;

    let userPos: { lat: number; lng: number } | null = null;
    this.userLocationStore.subscribe(val => { userPos = val; })();

    if (chirp.ourH3Index && chirp.ourH3Index !== 0) {
      try {
        const coords = H3GridEngine.h3ToCoord(BigInt(chirp.ourH3Index));
        lat = coords.lat;
        lng = coords.lng;
      } catch {
        // Fallback
      }
    } else if (userPos) {
      const angle = (chirp.ourShortNodeId % 360) * (Math.PI / 180);
      const dLat = (distanceMeters * Math.cos(angle)) / 111320;
      const dLng = (distanceMeters * Math.sin(angle)) / (111320 * Math.cos((userPos.lat * Math.PI) / 180));
      lat = userPos.lat + dLat;
      lng = userPos.lng + dLng;
    }

    const peer: IDiscoveredPeer = {
      shortNodeId,
      lat,
      lng,
      batteryBars: chirp.batteryLevel || 4,
      rssiTier,
      distanceMeters,
      lastSeen: Date.now(),
      isRelay: !chirp.isLegacyBt,
      isGateway: (chirp.radioCapabilities & 0x80) !== 0,
      isSos: (chirp.statusFlags & 0x01) !== 0
    };

    this.peersStore.update((map) => {
      map.set(shortNodeId, peer);
      return map;
    });
  }

  /**
   * Adds or updates a manually paired friend peer
   */
  public addFriendPeer(shortNodeId: string, fullNodeId?: string) {
    this.peersStore.update((map) => {
      const existing = map.get(shortNodeId);
      if (existing) {
        existing.isFriend = true;
        if (fullNodeId) existing.fullNodeId = fullNodeId;
      } else {
        let userPos: { lat: number; lng: number } | null = null;
        this.userLocationStore.subscribe(val => { userPos = val; })();
        const baseLat = userPos?.lat ?? 13.7563;
        const baseLng = userPos?.lng ?? 100.5018;

        map.set(shortNodeId, {
          shortNodeId,
          fullNodeId,
          lat: baseLat + 0.0003,
          lng: baseLng + 0.0003,
          batteryBars: 5,
          rssiTier: 3,
          distanceMeters: 30,
          lastSeen: Date.now(),
          isFriend: true
        });
      }
      return map;
    });
  }

  /**
   * Starts periodic BLE Presence Chirp broadcasting (every 8 seconds)
   */
  public startPresenceBroadcaster(myShortNodeId = 0x47A1) {
    if (this.isBroadcasting) return;
    this.isBroadcasting = true;

    const broadcastOnce = () => {
      try {
        let userPos: { lat: number; lng: number } | null = null;
        this.userLocationStore.subscribe(val => { userPos = val; })();

        let h3Index = 0;
        if (userPos) {
          try {
            const h3Big = H3GridEngine.coordToH3(userPos.lat, userPos.lng, 9);
            h3Index = Number(h3Big & BigInt(0xffffffff));
          } catch {}
        }

        const chirpPayload: Omit<IPresenceChirp, 'packetType' | 'crc16'> = {
          hopCount: 1,
          ourShortNodeId: myShortNodeId,
          batteryLevel: 5,
          isCharging: false,
          statusFlags: 0,
          ourH3Index: h3Index,
          radioCapabilities: 0x0A,
          neighbors: []
        };

        const rawChirp = PacketSerializer.serializePresenceChirp(chirpPayload);
        this.dispatcher.transmitRadioPacket(rawChirp, false);
      } catch (err) {
        // Non-blocking
      }
    };

    broadcastOnce();
    this.beaconIntervalId = setInterval(broadcastOnce, 8000);
  }

  public stopPresenceBroadcaster() {
    if (this.beaconIntervalId) {
      clearInterval(this.beaconIntervalId);
      this.beaconIntervalId = null;
    }
    this.isBroadcasting = false;
  }

  public getStore() {
    return this.peersStore;
  }

  public getUserLocationStore() {
    return this.userLocationStore;
  }
}

export const peerDiscoveryManager = new PeerDiscoveryStoreManager();

export const discoveredPeersStore = derived(
  peerDiscoveryManager.getStore(),
  ($map) => Array.from($map.values())
);

export const peerCountsStore = derived(
  discoveredPeersStore,
  ($peers): IPeerCounts => {
    let sos = 0;
    let friends = 0;
    let relays = 0;
    let gateways = 0;

    for (const p of $peers) {
      if (p.isSos) sos++;
      if (p.isFriend) friends++;
      if (p.isRelay) relays++;
      if (p.isGateway) gateways++;
    }

    return {
      sos,
      friends,
      relays,
      gateways,
      total: $peers.length
    };
  }
);
