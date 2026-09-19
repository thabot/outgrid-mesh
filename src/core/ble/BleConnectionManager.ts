/**
 * BLE GATT Connection Manager & High-Throughput MTU Negotiator
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export const DEFAULT_BLE_MTU = 23;
export const TARGET_MAX_MTU = 512; // High-throughput MTU

export interface IGattSession {
  remoteAddress: string;
  mtu: number;
  isConnected: boolean;
  connectedAt: number;
}

export class BleConnectionManager {
  private activeSessions: Map<string, IGattSession> = new Map();

  /**
   * Initiates a GATT connection and negotiates MTU up to 512 Bytes
   */
  public connect(remoteAddress: string, requestedMtu = TARGET_MAX_MTU): IGattSession {
    // Standard BLE MTU negotiation clamps between 23 and 512
    const negotiatedMtu = Math.max(DEFAULT_BLE_MTU, Math.min(TARGET_MAX_MTU, requestedMtu));

    const session: IGattSession = {
      remoteAddress,
      mtu: negotiatedMtu,
      isConnected: true,
      connectedAt: Date.now()
    };

    this.activeSessions.set(remoteAddress, session);
    return session;
  }

  /**
   * Closes an active GATT session
   */
  public disconnect(remoteAddress: string): boolean {
    const session = this.activeSessions.get(remoteAddress);
    if (!session) return false;
    session.isConnected = false;
    return this.activeSessions.delete(remoteAddress);
  }

  public getSession(remoteAddress: string): IGattSession | undefined {
    return this.activeSessions.get(remoteAddress);
  }

  public getActiveCount(): number {
    return this.activeSessions.size;
  }

  public clear(): void {
    this.activeSessions.clear();
  }
}
