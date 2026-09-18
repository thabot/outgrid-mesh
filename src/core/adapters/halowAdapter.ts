/**
 * Wi-Fi HaLow (IEEE 802.11ah Sub-1GHz) Protocol Bridge Adapter
 * OutGrid Mesh - Architectural Open Interoperability Layer
 * Author: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import type { IProtocolAdapter } from './IProtocolAdapter.js';
import type { ITOGPacket } from '../protocol/TOGPacket.js';

export interface IHaLowRadioConfig {
  frequencyBand: '850MHz' | '900MHz' | '920MHz';
  channelWidth: 1 | 2 | 4 | 8; // MHz
  txPowerDbm: number;
}

export class HaLowAdapter implements IProtocolAdapter {
  readonly protocolName = 'IEEE-802.11ah-HaLow';
  private _isConnected = false;
  private inboundCallback: ((packet: ITOGPacket) => void) | null = null;
  private config: IHaLowRadioConfig;

  constructor(config?: Partial<IHaLowRadioConfig>) {
    this.config = {
      frequencyBand: config?.frequencyBand ?? '920MHz',
      channelWidth: config?.channelWidth ?? 2,
      txPowerDbm: config?.txPowerDbm ?? 20
    };
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  async initialize(): Promise<void> {
    // Scaffold driver connection to Sub-1GHz USB-C dongle or embedded chipset
    this._isConnected = false;
  }

  async connect(targetIdentifier?: string): Promise<boolean> {
    // Open Sub-1GHz Raw Socket / Radio Interface
    this._isConnected = true;
    return true;
  }

  async disconnect(): Promise<void> {
    this._isConnected = false;
  }

  async relayOutbound(packet: ITOGPacket): Promise<boolean> {
    if (!this._isConnected) return false;
    // Broadcast TOG v1.1 Frame across 1-1.5km Sub-1GHz PHY
    return true;
  }

  onInboundPacket(callback: (packet: ITOGPacket) => void): void {
    this.inboundCallback = callback;
  }
}
