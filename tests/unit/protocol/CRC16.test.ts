import { describe, it, expect } from 'bun:test';
import { CRC16 } from '@core/protocol/CRC16';

describe('CRC16 (Phase 2 Task 2.6.2)', () => {
  it('should accurately compute CRC-16-CCITT for standard test vectors', () => {
    // Standard ASCII "123456789" CRC-16-CCITT check value is 0x29B1
    const testBytes = new TextEncoder().encode('123456789');
    const crc = CRC16.compute(testBytes);
    expect(crc).toBe(0x29b1);
  });

  it('should append and verify valid 2-byte checksum at the end of packet', () => {
    const packet = new Uint8Array([0x54, 0x4f, 0x01, 0x07, 0x90, 0x11, 0x22]);
    const withChecksum = CRC16.appendChecksum(packet);

    expect(withChecksum.length).toBe(packet.length + 2);
    expect(CRC16.verifyChecksum(withChecksum)).toBe(true);
  });

  it('should detect bit-flip errors and reject corrupted packets 100%', () => {
    const packet = new Uint8Array([0x54, 0x4f, 0x01, 0x07, 0x90, 0x11, 0x22]);
    const withChecksum = CRC16.appendChecksum(packet);

    // Single-bit flip in data payload
    const corrupted1 = new Uint8Array(withChecksum);
    corrupted1[2] ^= 0x01; // flip 1 bit
    expect(CRC16.verifyChecksum(corrupted1)).toBe(false);

    // Burst 4-bit error in header
    const corrupted2 = new Uint8Array(withChecksum);
    corrupted2[0] ^= 0x0f;
    expect(CRC16.verifyChecksum(corrupted2)).toBe(false);

    // Tampered checksum byte
    const corrupted3 = new Uint8Array(withChecksum);
    corrupted3[withChecksum.length - 1] ^= 0x80;
    expect(CRC16.verifyChecksum(corrupted3)).toBe(false);
  });
});
