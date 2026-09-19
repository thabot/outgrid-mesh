/**
 * Hardware ScanFilter & BLE Scanner Engine
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { TOG_MAGIC } from '../protocol/TOGPacket';

export interface IScanResult {
  deviceAddress: string;
  rssiDbm: number;
  manufacturerId: number;
  rawPayload: Uint8Array;
  timestamp: number;
}

export type ScanCallback = (result: IScanResult) => void;

export class BleScanner {
  private isScanning: boolean = false;
  private onPacketReceived?: ScanCallback;
  private seenHashes: Set<string> = new Set();

  /**
   * Hardware ScanFilter configuration definition for Android/iOS Native
   */
  public static getHardwareFilterConfig() {
    return {
      manufacturerId: TOG_MAGIC,
      manufacturerDataMask: [0xff, 0xff]
    };
  }

  public startScan(callback: ScanCallback): void {
    this.isScanning = true;
    this.onPacketReceived = callback;
  }

  public stopScan(): void {
    this.isScanning = false;
    this.onPacketReceived = undefined;
    this.seenHashes.clear();
  }

  /**
   * Simulates/Processes an incoming raw BLE advertisement
   * Filters by TOG_MAGIC and performs duplicate rejection at radio driver level
   */
  public processRawAdv(
    deviceAddress: string,
    rssiDbm: number,
    manufacturerId: number,
    rawPayload: Uint8Array
  ): boolean {
    if (!this.isScanning) return false;

    // Hardware Filter: Discard any advert that is not TOG_MAGIC
    if (manufacturerId !== TOG_MAGIC) {
      return false;
    }

    // Hardware duplicate filter: Fast payload hash check
    const payloadHash = `${deviceAddress}_${rawPayload.length}_${rawPayload[0]}_${rawPayload[rawPayload.length - 1]}`;
    if (this.seenHashes.has(payloadHash)) {
      return false; // Dropped duplicate without waking CPU
    }

    this.seenHashes.add(payloadHash);
    if (this.seenHashes.size > 2000) {
      this.seenHashes.clear();
    }

    if (this.onPacketReceived) {
      this.onPacketReceived({
        deviceAddress,
        rssiDbm,
        manufacturerId,
        rawPayload,
        timestamp: Date.now()
      });
    }

    return true;
  }

  public isRunning(): boolean {
    return this.isScanning;
  }
}
