/**
 * Briar Bramble Transport Protocol (BTP) Bridge Adapter
 * OutGrid Mesh - Architectural Open Interoperability Layer
 * Author: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import type { IProtocolAdapter } from './IProtocolAdapter.js';
import type { ITOGPacket } from '../protocol/TOGPacket.js';

export class BriarAdapter implements IProtocolAdapter {
  readonly protocolName = 'Briar-BTP-GPLv3';
  private _isConnected = false;
  private inboundCallback: ((packet: ITOGPacket) => void) | null = null;

  get isConnected(): boolean {
    return this._isConnected;
  }

  async initialize(): Promise<void> {
    this._isConnected = false;
  }

  async connect(targetSocket?: string): Promise<boolean> {
    // Connect Bluetooth RFCOMM / Wi-Fi Local Socket to Briar peer
    this._isConnected = true;
    return true;
  }

  async disconnect(): Promise<void> {
    this._isConnected = false;
  }

  async relayOutbound(packet: ITOGPacket): Promise<boolean> {
    if (!this._isConnected) return false;
    // Translate TOG v1.1 to BTP Framing
    return true;
  }

  onInboundPacket(callback: (packet: ITOGPacket) => void): void {
    this.inboundCallback = callback;
  }
}
