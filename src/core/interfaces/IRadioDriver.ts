/**
 * Hexagonal Port: Radio Driver Interface
 * Protocol: TOG v1.1
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export interface IRadioTransmissionResult {
  success: boolean;
  bytesSent: number;
  error?: string;
}

export type RadioPacketCallback = (packetData: Uint8Array, rssi?: number) => void;

export interface IRadioDriver {
  /** Driver identifier (e.g., 'BLE_CODED_S8', 'WIFI_P2P', 'MOCK_RADIO') */
  readonly driverName: string;

  /** Initialize and power on the radio hardware/layer */
  initialize(): Promise<boolean>;

  /** Start listening/scanning for incoming radio packets */
  startReceiving(onPacketReceived: RadioPacketCallback): Promise<void>;

  /** Stop listening/scanning */
  stopReceiving(): Promise<void>;

  /** Broadcast packet into the physical or simulated medium */
  broadcastPacket(packetData: Uint8Array): Promise<IRadioTransmissionResult>;

  /** Check if this radio hardware is currently available and powered on */
  isAvailable(): boolean;

  /** Terminate and release radio resources */
  destroy(): Promise<void>;
}
