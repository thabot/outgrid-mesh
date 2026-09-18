/**
 * Meshtastic LoRa BLE Companion Bridge Adapter
 * OutGrid Mesh - Architectural Open Interoperability Layer
 * Author: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import type { IProtocolAdapter } from './IProtocolAdapter.js';
import type { ITOGPacket } from '../protocol/TOGPacket.js';

export class MeshtasticAdapter implements IProtocolAdapter {
  readonly protocolName = 'Meshtastic-LoRa-BLE';
  private _isConnected = false;
  private inboundCallback: ((packet: ITOGPacket) => void) | null = null;

  get isConnected(): boolean {
    return this._isConnected;
  }

  async initialize(): Promise<void> {
    this._isConnected = false;
  }

  async connect(targetBleAddress?: string): Promise<boolean> {
    // Scan Service UUID 0xCBF0 and connect GATT
    this._isConnected = true;
    return true;
  }

  async disconnect(): Promise<void> {
    this._isConnected = false;
  }

  async relayOutbound(packet: ITOGPacket): Promise<boolean> {
    if (!this._isConnected) return false;
    // Translate TOG v1.1 to Meshtastic Protobuf
    return true;
  }

  onInboundPacket(callback: (packet: ITOGPacket) => void): void {
    this.inboundCallback = callback;
  }
}
