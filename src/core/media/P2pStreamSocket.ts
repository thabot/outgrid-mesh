/**
 * P2P Stream Socket with CRC32 Checksum Verification & Chunk Reassembly
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Burst Media Streaming
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export interface IStreamChunk {
  streamId: string;
  chunkIndex: number;
  totalChunks: number;
  payload: Uint8Array;
  crc32: number;
}

export class P2pStreamSocket {
  private activeStreams: Map<string, { totalChunks: number; chunks: Map<number, Uint8Array> }> = new Map();

  /**
   * Fast IEEE 802.3 CRC32 implementation
   */
  public static calculateCrc32(data: Uint8Array): number {
    let crc = 0 ^ (-1);
    for (let i = 0; i < data.length; i++) {
      crc = (crc >>> 8) ^ P2pStreamSocket.crcTable[(crc ^ data[i]) & 0xff];
    }
    return (crc ^ (-1)) >>> 0;
  }

  private static crcTable: Uint32Array = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c >>> 0;
    }
    return table;
  })();

  /**
   * Chunks large media payloads for P2P socket transmission
   */
  public static chunkPayload(streamId: string, payload: Uint8Array, chunkSize = 16384): IStreamChunk[] {
    const totalChunks = Math.ceil(payload.length / chunkSize) || 1;
    const chunks: IStreamChunk[] = [];

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, payload.length);
      const chunkData = payload.slice(start, end);
      const crc = P2pStreamSocket.calculateCrc32(chunkData);

      chunks.push({
        streamId,
        chunkIndex: i,
        totalChunks,
        payload: chunkData,
        crc32: crc,
      });
    }

    return chunks;
  }

  /**
   * Receives a stream chunk, verifies CRC32, and stores for reassembly
   * Returns assembled Uint8Array when all chunks arrive, or null if incomplete
   */
  public receiveChunk(chunk: IStreamChunk): Uint8Array | null {
    // 1. Verify CRC32
    const computedCrc = P2pStreamSocket.calculateCrc32(chunk.payload);
    if (computedCrc !== chunk.crc32) {
      throw new Error(`CRC32 mismatch for chunk ${chunk.chunkIndex} of stream ${chunk.streamId}`);
    }

    // 2. Initialize or get stream tracker
    if (!this.activeStreams.has(chunk.streamId)) {
      this.activeStreams.set(chunk.streamId, {
        totalChunks: chunk.totalChunks,
        chunks: new Map(),
      });
    }

    const stream = this.activeStreams.get(chunk.streamId)!;
    stream.chunks.set(chunk.chunkIndex, chunk.payload);

    // 3. Check if all chunks received
    if (stream.chunks.size === stream.totalChunks) {
      let totalLength = 0;
      for (let i = 0; i < stream.totalChunks; i++) {
        const piece = stream.chunks.get(i);
        if (!piece) return null; // Missing piece guard
        totalLength += piece.length;
      }

      const fullBuffer = new Uint8Array(totalLength);
      let offset = 0;
      for (let i = 0; i < stream.totalChunks; i++) {
        const piece = stream.chunks.get(i)!;
        fullBuffer.set(piece, offset);
        offset += piece.length;
      }

      // Cleanup finished stream
      this.activeStreams.delete(chunk.streamId);
      return fullBuffer;
    }

    return null;
  }
}
