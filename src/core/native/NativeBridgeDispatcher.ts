/**
 * Two-Way Native Bridge Dispatcher & Event Router
 * Connects window.AndroidBridge to TypeScript Core Pipeline
 * Gracefully falls back to MockOutGridBridge in web browsers
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Native Dispatcher
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { MockOutGridBridge, type IBatteryInfoPayload, type ICompassOrientationPayload, type IBarometerAltitudePayload } from './MockOutGridBridge';

export interface INativePacketEvent {
  bytes: Uint8Array;
  rssi: number;
}

export type NativePacketCallback = (event: INativePacketEvent) => void;

export class NativeBridgeDispatcher {
  private static instance: NativeBridgeDispatcher | null = null;
  private bridgeImpl: any = null;
  private isNativeAndroid: boolean = false;
  private packetListeners: Set<NativePacketCallback> = new Set();

  private constructor() {
    this.initBridge();
  }

  public static getInstance(): NativeBridgeDispatcher {
    if (!NativeBridgeDispatcher.instance) {
      NativeBridgeDispatcher.instance = new NativeBridgeDispatcher();
    }
    return NativeBridgeDispatcher.instance;
  }

  private initBridge() {
    const globalObj = typeof window !== 'undefined' ? (window as any) : (globalThis as any);

    if (globalObj && globalObj.AndroidBridge) {
      this.bridgeImpl = globalObj.AndroidBridge;
      this.isNativeAndroid = true;
    } else {
      this.bridgeImpl = new MockOutGridBridge();
      this.isNativeAndroid = false;
    }

    // Register OutGridMesh global namespace for incoming native packet dispatch
    if (globalObj) {
      if (!globalObj.OutGridMesh) {
        globalObj.OutGridMesh = {};
      }
      globalObj.OutGridMesh.receiveNativePacket = (base64Payload: string, rssi: number) => {
        this.handleIncomingNativePacket(base64Payload, rssi);
      };
    }
  }

  public handleIncomingNativePacket(base64Payload: string, rssi: number) {
    try {
      const binaryString = typeof atob !== 'undefined'
        ? atob(base64Payload)
        : Buffer.from(base64Payload, 'base64').toString('binary');
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const event: INativePacketEvent = { bytes, rssi };
      for (const listener of this.packetListeners) {
        try {
          listener(event);
        } catch (err) {
          console.error('Error in packet listener:', err);
        }
      }
    } catch (err) {
      console.error('Failed to decode incoming native packet base64:', err);
    }
  }

  public subscribeToPackets(callback: NativePacketCallback): () => void {
    this.packetListeners.add(callback);
    return () => {
      this.packetListeners.delete(callback);
    };
  }

  public isNative(): boolean {
    return this.isNativeAndroid;
  }

  public toggleTorch(enabled: boolean): boolean {
    return Boolean(this.bridgeImpl.toggleTorch(enabled));
  }

  public startSosStrobe(): boolean {
    return Boolean(this.bridgeImpl.startSosStrobe());
  }

  public stopTorch(): boolean {
    return Boolean(this.bridgeImpl.stopTorch());
  }

  public getBatteryInfo(): IBatteryInfoPayload {
    const raw = this.bridgeImpl.getBatteryInfo();
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }

  public requestBatteryOptimizationExemption(): boolean {
    return Boolean(this.bridgeImpl.requestBatteryOptimizationExemption());
  }

  public isIgnoringBatteryOptimizations(): boolean {
    return Boolean(this.bridgeImpl.isIgnoringBatteryOptimizations());
  }

  public shareApkFile(): boolean {
    return Boolean(this.bridgeImpl.shareApkFile());
  }

  public startApkHotspot(): string {
    return String(this.bridgeImpl.startApkHotspot());
  }

  public stopApkHotspot(): boolean {
    return Boolean(this.bridgeImpl.stopApkHotspot());
  }

  public wakeScreenForEmergency(): boolean {
    return Boolean(this.bridgeImpl.wakeScreenForEmergency());
  }

  public vibrateSosPattern(): boolean {
    return Boolean(this.bridgeImpl.vibrateSosPattern());
  }

  public getCompassOrientation(): ICompassOrientationPayload {
    const raw = this.bridgeImpl.getCompassOrientation();
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }

  public getBarometerAltitude(): IBarometerAltitudePayload {
    const raw = this.bridgeImpl.getBarometerAltitude();
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }

  public transmitRadioPacket(bytes: Uint8Array, txPowerHigh: boolean = true): boolean {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = typeof btoa !== 'undefined'
      ? btoa(binary)
      : Buffer.from(bytes).toString('base64');

    return Boolean(this.bridgeImpl.transmitRadioPacket(base64, txPowerHigh));
  }
}

