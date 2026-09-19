/**
 * Large Payload Fragmentation & Out-of-Order Bitmask Reassembler
 * Splits payloads into chunks <= 180B for BLE MTU compliance
 * Reassembles out-of-order chunks via Uint32Array bitmask checklist with 15-minute buffer timeout
 * Protocol: TOG v1.1 Wire Protocol
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export const MAX_FRAGMENT_CHUNK_SIZE = 180; // MTU-safe chunk size
export const REASSEMBLY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes buffer TTL

export interface IFragmentPacket {
  messageId: bigint;
  totalChunks: number;
  sequenceIndex: number;
  data: Uint8Array;
}

export class Fragmenter {
  /**
   * Slices a large payload (WebP image or Opus voice memo) into <= 180B chunks
   * Sub-Header (4B): [Total_Chunks 16b] + [Sequence_Index 16b]
   */
  public static slice(
    messageId: bigint,
    payload: Uint8Array,
    chunkSize = MAX_FRAGMENT_CHUNK_SIZE
  ): IFragmentPacket[] {
    const totalChunks = Math.ceil(payload.length / chunkSize) || 1;
    const fragments: IFragmentPacket[] = [];

    for (let seq = 0; seq < totalChunks; seq++) {
      const start = seq * chunkSize;
      const end = Math.min(payload.length, start + chunkSize);
      fragments.push({
        messageId,
        totalChunks,
        sequenceIndex: seq,
        data: payload.subarray(start, end)
      });
    }

    return fragments;
  }

  /**
   * Serializes a single fragment packet into wire bytes
   */
  public static serializeFragment(frag: IFragmentPacket): Uint8Array {
    const buf = new Uint8Array(12 + frag.data.length);
    const view = new DataView(buf.buffer);
    view.setBigUint64(0, frag.messageId, false);
    view.setUint16(8, frag.totalChunks, false);
    view.setUint16(10, frag.sequenceIndex, false);
    buf.set(frag.data, 12);
    return buf;
  }

  /**
   * Deserializes wire bytes into a fragment packet
   */
  public static deserializeFragment(buf: Uint8Array): IFragmentPacket {
    if (buf.length < 12) {
      throw new Error(`Fragment buffer too small: ${buf.length} < 12`);
    }
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const messageId = view.getBigUint64(0, false);
    const totalChunks = view.getUint16(8, false);
    const sequenceIndex = view.getUint16(10, false);
    const data = new Uint8Array(buf.subarray(12));
    return { messageId, totalChunks, sequenceIndex, data };
  }
}

interface IReassemblySession {
  messageId: bigint;
  totalChunks: number;
  receivedCount: number;
  bitmask: Uint32Array; // 1 bit per chunk
  chunks: Map<number, Uint8Array>;
  createdAt: number;
  lastUpdated: number;
}

export class Reassembler {
  private sessions = new Map<string, IReassemblySession>();

  /**
   * Ingests an incoming fragment. Returns the complete reassembled Uint8Array if all chunks arrive, or null if incomplete.
   */
  public ingestFragment(fragment: IFragmentPacket): Uint8Array | null {
    this.evictExpiredSessions();

    const key = fragment.messageId.toString();
    let session = this.sessions.get(key);

    if (!session) {
      const bitmaskWords = Math.ceil(fragment.totalChunks / 32) || 1;
      session = {
        messageId: fragment.messageId,
        totalChunks: fragment.totalChunks,
        receivedCount: 0,
        bitmask: new Uint32Array(bitmaskWords),
        chunks: new Map(),
        createdAt: Date.now(),
        lastUpdated: Date.now()
      };
      this.sessions.set(key, session);
    }

    const seq = fragment.sequenceIndex;
    const wordIdx = Math.floor(seq / 32);
    const bitIdx = seq % 32;

    // Check if duplicate fragment already received
    const isAlreadyReceived = (session.bitmask[wordIdx]! & (1 << bitIdx)) !== 0;
    if (!isAlreadyReceived) {
      // Mark bitmask checklist
      session.bitmask[wordIdx]! |= (1 << bitIdx);
      session.chunks.set(seq, fragment.data);
      session.receivedCount++;
      session.lastUpdated = Date.now();
    }

    // Check if fully completed
    if (session.receivedCount === session.totalChunks) {
      // Assemble full payload in order
      let totalBytes = 0;
      for (let i = 0; i < session.totalChunks; i++) {
        totalBytes += session.chunks.get(i)?.length || 0;
      }

      const assembled = new Uint8Array(totalBytes);
      let offset = 0;
      for (let i = 0; i < session.totalChunks; i++) {
        const chunkData = session.chunks.get(i)!;
        assembled.set(chunkData, offset);
        offset += chunkData.length;
      }

      // Cleanup session from RAM
      this.sessions.delete(key);
      return assembled;
    }

    return null;
  }

  /**
   * Returns a list of missing chunk indices for selective NACK repair
   */
  public getMissingChunkIndices(messageId: bigint): number[] {
    const session = this.sessions.get(messageId.toString());
    if (!session) return [];

    const missing: number[] = [];
    for (let i = 0; i < session.totalChunks; i++) {
      const wordIdx = Math.floor(i / 32);
      const bitIdx = i % 32;
      if ((session.bitmask[wordIdx]! & (1 << bitIdx)) === 0) {
        missing.push(i);
      }
    }
    return missing;
  }

  /**
   * Evicts sessions older than 15 minutes (Buffer Timeout) to free RAM
   */
  public evictExpiredSessions(): number {
    const now = Date.now();
    let evicted = 0;
    for (const [key, session] of this.sessions.entries()) {
      if (now - session.lastUpdated > REASSEMBLY_TIMEOUT_MS) {
        this.sessions.delete(key);
        evicted++;
      }
    }
    return evicted;
  }

  public getActiveSessionCount(): number {
    return this.sessions.size;
  }

  public clear(): void {
    this.sessions.clear();
  }
}
