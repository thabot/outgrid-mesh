/**
 * Mesh Chat Payload, WebP/Opus Fragmentation, and E2EE Packet Codec (Sprint E Task E.2 & E.5)
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Tactical Chat Hub
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export interface IChatChunk {
  messageId: string;
  chunkIndex: number;
  totalChunks: number;
  data: Uint8Array;
}

export interface IChatMessage {
  id: string;
  senderNodeId: string;
  recipientNodeId?: string; // Empty for broadcast
  text: string;
  timestamp: number;
  isEncrypted: boolean;
  hopPreset: 'local' | 'community' | 'max';
  ttlHops: number;
  isPinned?: boolean;
  imageBlob?: Uint8Array;
  audioBlob?: Uint8Array;
}

export class MeshChatPayloadManager {
  public static readonly CHUNK_SIZE_BYTES = 180; // Maximum safe payload per BLE Coded S=8 frame

  /**
   * Splits a media binary buffer (e.g. WebP image 5-12KB or Opus clip 2-3KB) into safe BLE chunks
   */
  public static fragmentBuffer(messageId: string, buffer: Uint8Array): IChatChunk[] {
    const totalChunks = Math.ceil(buffer.length / MeshChatPayloadManager.CHUNK_SIZE_BYTES);
    const chunks: IChatChunk[] = [];

    for (let i = 0; i < totalChunks; i++) {
      const start = i * MeshChatPayloadManager.CHUNK_SIZE_BYTES;
      const end = Math.min(start + MeshChatPayloadManager.CHUNK_SIZE_BYTES, buffer.length);
      chunks.push({
        messageId,
        chunkIndex: i,
        totalChunks,
        data: buffer.slice(start, end)
      });
    }

    return chunks;
  }

  /**
   * Reassembles out-of-order chunks into the original binary buffer
   * Returns null if not all chunks are present
   */
  public static reassembleChunks(chunks: IChatChunk[]): Uint8Array | null {
    if (chunks.length === 0) return null;
    const totalChunks = chunks[0].totalChunks;
    if (chunks.length < totalChunks) return null;

    // Check that we have every chunk index from 0 to totalChunks - 1
    const sorted = [...chunks].sort((a, b) => a.chunkIndex - b.chunkIndex);
    const uniqueMap = new Map<number, Uint8Array>();
    for (const chunk of sorted) {
      uniqueMap.set(chunk.chunkIndex, chunk.data);
    }

    if (uniqueMap.size !== totalChunks) return null;

    let totalLength = 0;
    for (let i = 0; i < totalChunks; i++) {
      const d = uniqueMap.get(i);
      if (!d) return null;
      totalLength += d.length;
    }

    const reassembled = new Uint8Array(totalLength);
    let offset = 0;
    for (let i = 0; i < totalChunks; i++) {
      const d = uniqueMap.get(i)!;
      reassembled.set(d, offset);
      offset += d.length;
    }

    return reassembled;
  }

  /**
   * Maps user-facing Hop Preset chip to network TTL Hop count
   */
  public static resolveHopCount(preset: 'local' | 'community' | 'max'): number {
    switch (preset) {
      case 'local':
        return 3;
      case 'community':
        return 7;
      case 'max':
        return 15;
      default:
        return 5;
    }
  }

  /**
   * Lightweight XOR / ChaCha keystream simulation for test environment
   */
  public static mockE2eeEncrypt(plaintext: string, secretKey: Uint8Array): Uint8Array {
    const enc = new TextEncoder().encode(plaintext);
    const out = new Uint8Array(enc.length);
    for (let i = 0; i < enc.length; i++) {
      out[i] = enc[i] ^ secretKey[i % secretKey.length];
    }
    return out;
  }

  public static mockE2eeDecrypt(ciphertext: Uint8Array, secretKey: Uint8Array): string {
    const out = new Uint8Array(ciphertext.length);
    for (let i = 0; i < ciphertext.length; i++) {
      out[i] = ciphertext[i] ^ secretKey[i % secretKey.length];
    }
    return new TextDecoder().decode(out);
  }
}
