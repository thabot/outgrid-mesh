/**
 * BLE Advertiser Engine (Legacy 31B & Extended Advertising)
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Radio Driver
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { TOG_MAGIC } from '../protocol/TOGPacket';

export interface IBleAdvSettings {
  useExtendedAdv: boolean; // True for BLE 5 Extended Advertising (up to 254B), False for Legacy (31B)
  dualMode?: boolean;      // True to support interleaved dual advertising (Extended + Legacy)
  dualModeRatio?: number;  // Ratio of Extended Adv to Legacy Adv bursts (default: 3 = 3 Extended : 1 Legacy)
  txPowerDbm: number;      // e.g. +8 dBm or +20 dBm
  intervalMs: number;      // Advertising interval (100ms - 1000ms)
}

export interface IBleAdvPayload {
  manufacturerId: number;  // 0x544F (TOG_MAGIC)
  data: Uint8Array;
  isLegacy?: boolean;      // Indicates if this payload is trimmed/targeted for BT 4.2 Legacy
}

export interface IBroadcastSlot {
  slotIndex: number;
  isLegacy: boolean;
  phyMode: 'CODED' | '1M';
  payload: IBleAdvPayload;
}

export class BleAdvertiser {
  private isAdvertising: boolean = false;
  private currentPayload: Uint8Array | null = null;
  private settings: IBleAdvSettings;
  private broadcastCycleCounter: number = 0;

  constructor(settings: Partial<IBleAdvSettings> = {}) {
    this.settings = {
      useExtendedAdv: settings.useExtendedAdv ?? true,
      dualMode: settings.dualMode ?? false,
      dualModeRatio: settings.dualModeRatio ?? 3,
      txPowerDbm: settings.txPowerDbm ?? 8,
      intervalMs: settings.intervalMs ?? 200
    };
  }

  /**
   * Prepares and starts advertising of raw TOG packet bytes
   */
  public startAdvertising(packetBytes: Uint8Array): boolean {
    const maxAllowed = this.settings.useExtendedAdv ? 254 : 31;
    if (packetBytes.length > maxAllowed) {
      throw new Error(`Payload size ${packetBytes.length}B exceeds advertising limit of ${maxAllowed}B`);
    }

    this.currentPayload = new Uint8Array(packetBytes);
    this.isAdvertising = true;
    this.broadcastCycleCounter = 0;
    return true;
  }

  /**
   * Stops current advertising
   */
  public stopAdvertising(): void {
    this.isAdvertising = false;
    this.currentPayload = null;
    this.broadcastCycleCounter = 0;
  }

  /**
   * Formats payload into standard BLE Manufacturer Data structure
   */
  public getManufacturerData(): IBleAdvPayload | null {
    if (!this.currentPayload) return null;
    return {
      manufacturerId: TOG_MAGIC,
      data: this.currentPayload,
      isLegacy: !this.settings.useExtendedAdv
    };
  }

  /**
   * Generates a truncated or downscaled Legacy 31-byte advertisement payload
   * for broadcasting to legacy devices (e.g. BT 4.2 Newland MT65) in dual-mode
   */
  public getLegacyManufacturerData(): IBleAdvPayload | null {
    if (!this.currentPayload) return null;
    // Legacy BLE 4.x allows max 31B total adv packet.
    // Safe chunk payload for legacy manufacturer data is up to 24B
    const legacyData = this.currentPayload.length <= 24
      ? this.currentPayload
      : this.currentPayload.subarray(0, 24);

    return {
      manufacturerId: TOG_MAGIC,
      data: legacyData,
      isLegacy: true
    };
  }

  /**
   * Interleaved Dual-Broadcasting Engine:
   * Selects the transmission slot (Extended vs Legacy 1M) based on current cycle counter.
   * If dualMode is enabled:
   * Cycles 0..(ratio-1) => Extended Coded PHY (Long Range Trunk)
   * Cycle ratio         => Legacy 1M PHY (31B Beacon for BT 4.2 devices like Newland MT65)
   */
  public getNextBroadcastSlot(): IBroadcastSlot | null {
    if (!this.isAdvertising || !this.currentPayload) return null;

    const currentSlot = this.broadcastCycleCounter;
    this.broadcastCycleCounter++;

    if (this.settings.dualMode && this.settings.useExtendedAdv) {
      const ratio = this.settings.dualModeRatio ?? 3;
      const period = ratio + 1;
      const cycleInPeriod = currentSlot % period;

      if (cycleInPeriod === ratio) {
        // Legacy slot for BT 4.2 peers
        return {
          slotIndex: currentSlot,
          isLegacy: true,
          phyMode: '1M',
          payload: this.getLegacyManufacturerData()!
        };
      } else {
        // Extended Coded slot for modern peers
        return {
          slotIndex: currentSlot,
          isLegacy: false,
          phyMode: 'CODED',
          payload: this.getManufacturerData()!
        };
      }
    }

    // Single-mode broadcast
    return {
      slotIndex: currentSlot,
      isLegacy: !this.settings.useExtendedAdv,
      phyMode: this.settings.useExtendedAdv ? 'CODED' : '1M',
      payload: this.getManufacturerData()!
    };
  }

  public isBroadcasting(): boolean {
    return this.isAdvertising;
  }

  public getSettings(): IBleAdvSettings {
    return { ...this.settings };
  }
}
