/**
 * BLE Packet Fragmentation & Out-of-Order Reassembly Engine
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export const MAX_CHUNK_PAYLOAD = 180; // Safe chunk size below MTU 200B

export interface IFragmentChunk {
  messageId: bigint;
  totalChunks: number;
  sequenceIndex: number;
  data: Uint8Array;
}

export class BlePacketFragmentation {
  /**
   * Splits a large payload into sequential numbered chunks
   * Chunk Header: [Total Chunks: 2B] + [Sequence Index: 2B] = 4B
   */
  public static splitIntoChunks(
    messageId: bigint,
    fullPayload: Uint8Array,
    maxChunkSize = MAX_CHUNK_PAYLOAD
  ): Uint8Array[] {
    const totalChunks = Math.ceil(fullPayload.length / maxChunkSize) || 1;
    const chunks: Uint8Array[] = [];

    for (let seq = 0; seq < totalChunks; seq++) {
      const start = seq * maxChunkSize;
      const end = Math.min(fullPayload.length, start + maxChunkSize);
      const chunkData = fullPayload.subarray(start, end);

      // Header: TotalChunks (2B) + SequenceIndex (2B)
      const chunkBuf = new Uint8Array(4 + chunkData.length);
      const view = new DataView(chunkBuf.buffer);
      view.setUint16(0, totalChunks, false);
      view.setUint16(2, seq, false);
      chunkBuf.set(chunkData, 4);

      chunks.push(chunkBuf);
    }

    return chunks;
  }

  /**
   * Reassembles out-of-order chunks back into the complete payload
   * Returns complete Uint8Array when all chunks arrive, or null if incomplete
   */
  public static reassembleChunks(
    collectedChunks: Uint8Array[]
  ): Uint8Array | null {
    if (collectedChunks.length === 0) return null;

    const parsedChunks: { seq: number; total: number; data: Uint8Array }[] = [];
    let expectedTotal = 0;

    for (const chunk of collectedChunks) {
      if (chunk.length < 4) continue;
      const view = new DataView(chunk.buffer, chunk.byteOffset, 4);
      const total = view.getUint16(0, false);
      const seq = view.getUint16(2, false);
      const data = chunk.subarray(4);

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
}
