/**
 * Unit tests for P2pStreamSocket
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { P2pStreamSocket } from '../../../src/core/media/P2pStreamSocket';

describe('P2pStreamSocket', () => {
  let socket: P2pStreamSocket;

  beforeEach(() => {
    socket = new P2pStreamSocket();
  });

  it('should chunk large payloads and reassemble in order', () => {
    const rawData = new Uint8Array(50000);
    for (let i = 0; i < rawData.length; i++) {
      rawData[i] = i % 256;
    }

    const chunks = P2pStreamSocket.chunkPayload('stream-001', rawData, 16384);
    expect(chunks.length).toBe(4); // 16384 * 3 = 49152, + 848 = 50000

    let assembled: Uint8Array | null = null;
    for (let i = 0; i < chunks.length; i++) {
      assembled = socket.receiveChunk(chunks[i]);
      if (i < chunks.length - 1) {
        expect(assembled).toBeNull();
      }
    }

    expect(assembled).not.toBeNull();
    expect(assembled?.length).toBe(50000);
    expect(assembled).toEqual(rawData);
  });

  it('should reassemble out-of-order chunks correctly', () => {
    const rawData = new Uint8Array(1000);
    for (let i = 0; i < rawData.length; i++) {
      rawData[i] = (i * 7) % 256;
    }

    const chunks = P2pStreamSocket.chunkPayload('stream-ooo', rawData, 250);
    expect(chunks.length).toBe(4);

    // Shuffle chunks
    expect(socket.receiveChunk(chunks[2])).toBeNull();
    expect(socket.receiveChunk(chunks[0])).toBeNull();
    expect(socket.receiveChunk(chunks[3])).toBeNull();
    const assembled = socket.receiveChunk(chunks[1]);

    expect(assembled).not.toBeNull();
    expect(assembled?.length).toBe(1000);
    expect(assembled).toEqual(rawData);
  });

  it('should reject chunks with CRC32 mismatch', () => {
    const rawData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const chunks = P2pStreamSocket.chunkPayload('stream-corrupt', rawData, 4);

    // Tamper with chunk payload
    chunks[0].payload[0] = 99;

    expect(() => {
      socket.receiveChunk(chunks[0]);
    }).toThrow('CRC32 mismatch');
  });
});
