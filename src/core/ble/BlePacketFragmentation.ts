/**
 * BLE Packet Fragmentation & Out-of-Order Reassembly Engine
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export const EXTENDED_BLE_CHUNK_PAYLOAD = 180; // Safe chunk size below MTU 200B for BLE 5 Extended Adv
export const LEGACY_BLE_CHUNK_PAYLOAD = 24;   // Safe chunk size for Bluetooth 4.2 Legacy 31B Adv
export const MAX_CHUNK_PAYLOAD = EXTENDED_BLE_CHUNK_PAYLOAD;
export const CHUNK_HEADER_SIZE = 8;           // Truncated MsgId (4B) + TotalChunks (2B) + SequenceIndex (2B)

export interface IFragmentChunk {
  messageId: bigint;
  truncatedMsgId: number;
  totalChunks: number;
  sequenceIndex: number;
  data: Uint8Array;
}

export interface IReassemblyBufferEntry {
  truncatedMsgId: number;
  totalChunks: number;
  receivedChunks: Map<number, Uint8Array>;
  firstReceivedAt: number;
}

export class BlePacketFragmentation {
  private static reassemblyStore: Map<number, IReassemblyBufferEntry> = new Map();
  public static REASSEMBLY_TIMEOUT_MS = 30000; // 30 seconds buffer eviction timeout

  /**
   * Splits a large payload into sequential numbered chunks with 8-Byte Wire Header:
   * [TruncatedMsgId: 4B uint32] + [TotalChunks: 2B uint16] + [SequenceIndex: 2B uint16]
   */
  public static splitIntoChunks(
    messageId: bigint,
    fullPayload: Uint8Array,
    maxChunkSize = MAX_CHUNK_PAYLOAD
  ): Uint8Array[] {
    const totalChunks = Math.ceil(fullPayload.length / maxChunkSize) || 1;
    const truncatedMsgId = Number(messageId & 0xffffffffn) >>> 0;
    const chunks: Uint8Array[] = [];

    for (let seq = 0; seq < totalChunks; seq++) {
      const start = seq * maxChunkSize;
      const end = Math.min(fullPayload.length, start + maxChunkSize);
      const chunkData = fullPayload.subarray(start, end);

      // Header: TruncatedMsgId (4B) + TotalChunks (2B) + SequenceIndex (2B) = 8B
      const chunkBuf = new Uint8Array(CHUNK_HEADER_SIZE + chunkData.length);
      const view = new DataView(chunkBuf.buffer);
      view.setUint32(0, truncatedMsgId, false);
      view.setUint16(4, totalChunks, false);
      view.setUint16(6, seq, false);
      chunkBuf.set(chunkData, CHUNK_HEADER_SIZE);

      chunks.push(chunkBuf);
    }

    return chunks;
  }

  /**
   * Generates both Extended (180B) and Legacy (24B) chunks in parallel for Dual-Mode broadcasting
   */
  public static createDualModeChunks(messageId: bigint, fullPayload: Uint8Array): {
    extendedChunks: Uint8Array[];
    legacyChunks: Uint8Array[];
  } {
    const extendedChunks = this.splitIntoChunks(messageId, fullPayload, EXTENDED_BLE_CHUNK_PAYLOAD);
    const legacyChunks = this.splitIntoChunks(messageId, fullPayload, LEGACY_BLE_CHUNK_PAYLOAD);
    return { extendedChunks, legacyChunks };
  }

  /**
   * Ingests a single chunk, tracks reassembly buffer per Message ID,
   * isolates collisions, and returns the complete payload if complete.
   */
  public static ingestChunk(chunkBuffer: Uint8Array, now = Date.now()): Uint8Array | null {
    if (chunkBuffer.length < CHUNK_HEADER_SIZE) return null;

    this.evictExpiredBuffers(now);

    const view = new DataView(chunkBuffer.buffer, chunkBuffer.byteOffset, chunkBuffer.byteLength);
    const truncatedMsgId = view.getUint32(0, false);
    const totalChunks = view.getUint16(4, false);
    const seq = view.getUint16(6, false);
    const data = chunkBuffer.subarray(CHUNK_HEADER_SIZE);

    let entry = this.reassemblyStore.get(truncatedMsgId);
    if (!entry) {
      entry = {
        truncatedMsgId,
        totalChunks,
        receivedChunks: new Map(),
        firstReceivedAt: now
      };
      this.reassemblyStore.set(truncatedMsgId, entry);
    }

    entry.receivedChunks.set(seq, data);

    if (entry.receivedChunks.size === entry.totalChunks) {
      // All chunks received! Reassemble in order
      const sortedSeqs = Array.from(entry.receivedChunks.keys()).sort((a, b) => a - b);
      let totalLength = 0;
      for (const s of sortedSeqs) {
        totalLength += entry.receivedChunks.get(s)!.length;
      }

      const complete = new Uint8Array(totalLength);
      let offset = 0;
      for (const s of sortedSeqs) {
        const part = entry.receivedChunks.get(s)!;
        complete.set(part, offset);
        offset += part.length;
      }

      this.reassemblyStore.delete(truncatedMsgId);
      return complete;
    }

    return null;
  }

  /**
   * Reassembles out-of-order chunks back into the complete payload (Stateless legacy helper)
   * Supports both 4-byte header and 8-byte header
   */
  public static reassembleChunks(
    collectedChunks: Uint8Array[]
  ): Uint8Array | null {
    if (collectedChunks.length === 0) return null;

    // Detect header size from first chunk
    const is8ByteHeader = collectedChunks[0].length >= 8;
    const headerSize = is8ByteHeader ? CHUNK_HEADER_SIZE : 4;

    const parsedChunks: { seq: number; total: number; data: Uint8Array }[] = [];
    let expectedTotal = 0;

    for (const chunk of collectedChunks) {
      if (chunk.length < headerSize) continue;
      const view = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength);
      let total: number;
      let seq: number;

      if (headerSize === 8) {
        total = view.getUint16(4, false);
        seq = view.getUint16(6, false);
      } else {
        total = view.getUint16(0, false);
        seq = view.getUint16(2, false);
      }
      const data = chunk.subarray(headerSize);

      expectedTotal = total;
      parsedChunks.push({ seq, total, data });
    }

    // Check if we have received all chunks
    const receivedSeqs = new Set(parsedChunks.map((c) => c.seq));
    if (receivedSeqs.size < expectedTotal) {
      return null; // Still waiting for missing chunks
    }

    // Sort by sequence index (guarantees out-of-order recovery)
    parsedChunks.sort((a, b) => a.seq - b.seq);

    // Calculate total reconstructed length
    let totalLen = 0;
    for (const c of parsedChunks) {
      totalLen += c.data.length;
    }

    const reassembled = new Uint8Array(totalLen);
    let offset = 0;
    for (const c of parsedChunks) {
      reassembled.set(c.data, offset);
      offset += c.data.length;
    }

    return reassembled;
  }

  /**
   * Purges expired incomplete reassembly buffers older than timeout
   */
  public static evictExpiredBuffers(now = Date.now()): number {
    let evicted = 0;
    for (const [id, entry] of this.reassemblyStore.entries()) {
      if (now - entry.firstReceivedAt > this.REASSEMBLY_TIMEOUT_MS) {
        this.reassemblyStore.delete(id);
        evicted++;
      }
    }
    return evicted;
  }

  public static clearStore(): void {
    this.reassemblyStore.clear();
  }
}
