/**
 * Multimedia Chunking & Voice Transport Engine
 * Handles low-res emergency photos (<= 3KB) and Opus voice notes (<= 4.5KB)
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export enum MediaType {
  EMERGENCY_PHOTO = 0x01,
  VOICE_NOTE = 0x02
}

export interface IMediaChunkHeader {
  mediaType: MediaType;
  totalChunks: number;
  chunkIndex: number;
  isHighRes: boolean;
}

export class MediaChunkingHandler {
  public static MEDIA_HEADER_SIZE = 8; // 8-Byte Wire Header

  /**
   * Splits media buffer into numbered chunks with 8B Media Header
   */
  public static splitMedia(
    mediaType: MediaType,
    mediaData: Uint8Array,
    maxChunkSize = 180,
    isHighRes = false
  ): Uint8Array[] {
    const totalChunks = Math.ceil(mediaData.length / maxChunkSize) || 1;
    const chunks: Uint8Array[] = [];

    for (let i = 0; i < totalChunks; i++) {
      const start = i * maxChunkSize;
      const end = Math.min(mediaData.length, start + maxChunkSize);
      const slice = mediaData.subarray(start, end);

      const buf = new Uint8Array(this.MEDIA_HEADER_SIZE + slice.length);
      const view = new DataView(buf.buffer);
      view.setUint8(0, mediaType);
      view.setUint8(1, isHighRes ? 1 : 0);
      view.setUint16(2, totalChunks, false);
      view.setUint16(4, i, false);
      view.setUint16(6, slice.length, false);
      buf.set(slice, this.MEDIA_HEADER_SIZE);

      chunks.push(buf);
    }

    return chunks;
  }

  /**
   * Reassembles media chunks
   */
  public static reassembleMedia(chunks: Uint8Array[]): Uint8Array | null {
    if (chunks.length === 0) return null;

    const parsed: { index: number; total: number; data: Uint8Array }[] = [];
    let expectedTotal = 0;

    for (const c of chunks) {
      if (c.length < this.MEDIA_HEADER_SIZE) continue;
      const view = new DataView(c.buffer, c.byteOffset, c.byteLength);
      const total = view.getUint16(2, false);
      const index = view.getUint16(4, false);
      const data = c.subarray(this.MEDIA_HEADER_SIZE);

      expectedTotal = total;
      parsed.push({ index, total, data });
    }

    const uniqueIndices = new Set(parsed.map((p) => p.index));
    if (uniqueIndices.size < expectedTotal) {
      return null;
    }

    parsed.sort((a, b) => a.index - b.index);

    let totalLen = 0;
    for (const p of parsed) {
      totalLen += p.data.length;
    }

    const result = new Uint8Array(totalLen);
    let offset = 0;
    for (const p of parsed) {
      result.set(p.data, offset);
      offset += p.data.length;
    }

    return result;
  }
}
