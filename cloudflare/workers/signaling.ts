/**
 * WebRTC P2P Signaling on Cloudflare Worker
 * Pairs rescue devices across H3 spatial cells via SDP offer/answer exchange
 * Zero Media Relay: All peer data flows strictly P2P via STUN
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Cloudless Edge Signaling
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export interface ISignalingMessage {
  fromNodeId: string;
  toNodeId: string;
  h3TileId: string;
  type: 'offer' | 'answer' | 'candidate';
  payload: string; // SDP string or ICE candidate JSON
  timestamp: number;
}

export class WebRtcSignalingEngine {
  // Spatial matchmaking rooms: Map<h3TileId, Set<nodeId>>
  private spatialRooms: Map<string, Set<string>> = new Map();
  // Deferred mailbox for SDP exchange: Map<toNodeId, ISignalingMessage[]>
  private mailboxes: Map<string, ISignalingMessage[]> = new Map();

  /**
   * Registers node presence in an H3 spatial cell
   */
  public joinSpatialCell(h3TileId: string, nodeId: string): string[] {
    if (!this.spatialRooms.has(h3TileId)) {
      this.spatialRooms.set(h3TileId, new Set());
    }
    const room = this.spatialRooms.get(h3TileId)!;
    const peers = Array.from(room).filter(id => id !== nodeId);
    room.add(nodeId);
    return peers; // Returns existing peers in the cell
  }

  public leaveSpatialCell(h3TileId: string, nodeId: string): void {
    const room = this.spatialRooms.get(h3TileId);
    if (room) {
      room.delete(nodeId);
      if (room.size === 0) {
        this.spatialRooms.delete(h3TileId);
      }
    }
  }

  /**
   * Dispatches SDP offer/answer/candidate to target peer mailbox
   */
  public sendSignal(msg: ISignalingMessage): boolean {
    if (!this.mailboxes.has(msg.toNodeId)) {
      this.mailboxes.set(msg.toNodeId, []);
    }
    const box = this.mailboxes.get(msg.toNodeId)!;
    if (box.length >= 20) {
      box.shift(); // Evict oldest signal if mailbox fills
    }
    box.push(msg);
    return true;
  }

  /**
   * Drains pending signals for a receiving node
   */
  public pollSignals(nodeId: string): ISignalingMessage[] {
    const messages = this.mailboxes.get(nodeId) || [];
    this.mailboxes.delete(nodeId);
    return messages;
  }
}
