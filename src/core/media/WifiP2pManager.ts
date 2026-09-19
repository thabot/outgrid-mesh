/**
 * Wi-Fi Direct (P2P) Group Formation & Dynamic Socket Manager
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 High-Throughput Burst Mode
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export interface IWifiP2pPeer {
  deviceAddress: string;
  deviceName: string;
  isGroupOwner: boolean;
  groupOwnerIp?: string;
  status: 'available' | 'invited' | 'connected' | 'failed';
}

export class WifiP2pManager {
  private peers: Map<string, IWifiP2pPeer> = new Map();
  private isGroupOwner: boolean = false;
  private groupOwnerAddress: string | null = null;
  private isConnected: boolean = false;

  /**
   * Discovers nearby Wi-Fi Direct peers
   */
  public registerDiscoveredPeer(peer: IWifiP2pPeer): void {
    this.peers.set(peer.deviceAddress, peer);
  }

  /**
   * Simulates Group Owner (GO) Negotiation
   * Determines whether this node or the peer acts as GO
   */
  public negotiateGroupOwner(peerAddress: string, myIntent = 7, peerIntent = 5): boolean {
    const peer = this.peers.get(peerAddress);
    if (!peer) return false;

    // Higher intent wins Group Owner status (0 - 15)
    if (myIntent >= peerIntent) {
      this.isGroupOwner = true;
      this.groupOwnerAddress = '192.168.49.1'; // Standard Android Wi-Fi Direct GO IP
      peer.isGroupOwner = false;
      peer.groupOwnerIp = this.groupOwnerAddress;
    } else {
      this.isGroupOwner = false;
      peer.isGroupOwner = true;
      peer.groupOwnerIp = '192.168.49.1';
      this.groupOwnerAddress = peer.groupOwnerIp;
    }

    peer.status = 'connected';
    this.isConnected = true;
    return true;
  }

  /**
   * Closes Wi-Fi Direct connection
   */
  public disconnect(): void {
    this.isConnected = false;
    this.isGroupOwner = false;
    this.groupOwnerAddress = null;
    for (const peer of this.peers.values()) {
      peer.status = 'available';
    }
  }

  public getIsGroupOwner(): boolean {
    return this.isGroupOwner;
  }

  public getGroupOwnerAddress(): string | null {
    return this.groupOwnerAddress;
  }

  public getConnectedPeerCount(): number {
    let count = 0;
    for (const p of this.peers.values()) {
      if (p.status === 'connected') count++;
    }
    return count;
  }
}
