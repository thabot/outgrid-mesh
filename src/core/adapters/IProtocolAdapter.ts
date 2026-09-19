/**
 * Pluggable Open Protocol Bridge Adapter Interface
 * OutGrid Mesh - Protocol Interoperability Layer
 * Author: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import type { ITOGPacket } from '../protocol/TOGPacket.js';

export interface IProtocolAdapter {
  readonly protocolName: string;
  readonly isConnected: boolean;

  initialize(): Promise<void>;
  connect(targetIdentifier?: string): Promise<boolean>;
  disconnect(): Promise<void>;
  relayOutbound(packet: ITOGPacket): Promise<boolean>;
  onInboundPacket(callback: (packet: ITOGPacket) => void): void;
}
