import { describe, it, expect } from 'bun:test';
import { MeshChatPayloadManager, type IChatChunk } from '../../../src/core/chat/MeshChatPayload';

describe('MeshChatPayload (Sprint E Task E.5 Media Chunking & E2EE Codec)', () => {
  it('should split 6KB WebP image into small chunks <= 180 bytes', () => {
    const fakeWebP = new Uint8Array(6144);
    for (let i = 0; i < fakeWebP.length; i++) {
      fakeWebP[i] = i % 256;
    }

    const chunks = MeshChatPayloadManager.fragmentBuffer('msg-webp-01', fakeWebP);
    expect(chunks.length).toBe(Math.ceil(6144 / 180));
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[0].totalChunks).toBe(chunks.length);
    expect(chunks[0].data.length).toBeLessThanOrEqual(180);
  });

  it('should reassemble chunks delivered out-of-order into the exact original buffer', () => {
    const originalBuffer = new Uint8Array(2048);
    for (let i = 0; i < originalBuffer.length; i++) {
      originalBuffer[i] = (i * 7) % 256;
    }

    const chunks = MeshChatPayloadManager.fragmentBuffer('msg-opus-01', originalBuffer);

    // Shuffle chunks into random delivery order
    const shuffled = [...chunks].sort(() => Math.random() - 0.5);

    const reassembled = MeshChatPayloadManager.reassembleChunks(shuffled);
    expect(reassembled).not.toBeNull();
    expect(reassembled!.length).toBe(originalBuffer.length);

    for (let i = 0; i < originalBuffer.length; i++) {
      expect(reassembled![i]).toBe(originalBuffer[i]);
    }
  });

  it('should return null when reassembling incomplete chunks', () => {
    const originalBuffer = new Uint8Array(1000);
    const chunks = MeshChatPayloadManager.fragmentBuffer('msg-incomplete', originalBuffer);

    // Drop the last chunk
    const partial = chunks.slice(0, chunks.length - 1);
    expect(MeshChatPayloadManager.reassembleChunks(partial)).toBeNull();
  });

  it('should resolve Hop Presets accurately according to TOG v1.1 standards', () => {
    expect(MeshChatPayloadManager.resolveHopCount('local')).toBe(3);
    expect(MeshChatPayloadManager.resolveHopCount('community')).toBe(7);
    expect(MeshChatPayloadManager.resolveHopCount('max')).toBe(15);
  });

  it('should encrypt and decrypt private 1:1 chat message with zero loss', () => {
    const secretKey = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0]);
    const message = '🚨 ต้องการความช่วยเหลือ มีเด็กติดอยู่ในอาคารชั้น 3 พิกัด 13.7563, 100.5018';

    const encrypted = MeshChatPayloadManager.mockE2eeEncrypt(message, secretKey);
    expect(encrypted.length).toBeGreaterThan(0);

    const decrypted = MeshChatPayloadManager.mockE2eeDecrypt(encrypted, secretKey);
    expect(decrypted).toBe(message);
  });
});
