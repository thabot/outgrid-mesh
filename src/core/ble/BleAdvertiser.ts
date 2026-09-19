/**
 * BLE Advertiser Engine (Legacy 31B & Extended Advertising)
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Radio Driver
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { TOG_MAGIC } from '../protocol/TOGPacket';

export interface IBleAdvSettings {
  useExtendedAdv: boolean; // True for BLE 5 Extended Advertising (up to 254B), False for Legacy (31B)
  txPowerDbm: number;      // e.g. +8 dBm or +20 dBm
  intervalMs: number;      // Advertising interval (100ms - 1000ms)
}

export interface IBleAdvPayload {
  manufacturerId: number;  // 0x544F (TOG_MAGIC)
  data: Uint8Array;
}

export class BleAdvertiser {
  private isAdvertising: boolean = false;
  private currentPayload: Uint8Array | null = null;
  private settings: IBleAdvSettings;

  constructor(settings: Partial<IBleAdvSettings> = {}) {
    this.settings = {
      useExtendedAdv: settings.useExtendedAdv ?? true,
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
    return true;
  }

  /**
   * Stops current advertising
   */
  public stopAdvertising(): void {
    this.isAdvertising = false;
    this.currentPayload = null;
  }

  /**
   * Formats payload into standard BLE Manufacturer Data structure
   */
  public getManufacturerData(): IBleAdvPayload | null {
    if (!this.currentPayload) return null;
    return {
      manufacturerId: TOG_MAGIC,
      data: this.currentPayload
    };
  }

  public isBroadcasting(): boolean {
    return this.isAdvertising;
  }

  public getSettings(): IBleAdvSettings {
    return { ...this.settings };
  }
}
