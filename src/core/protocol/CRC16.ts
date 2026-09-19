/**
 * CRC-16-CCITT Checksum Calculator & Frame Integrity Checker
 * Polynomial: 0x1021 (x^16 + x^12 + x^5 + 1), Initial: 0xFFFF
 * Protocol: TOG v1.1 Wire Format
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export class CRC16 {
  private static readonly POLYNOMIAL = 0x1021;
  private static readonly INITIAL_VALUE = 0xffff;
  private static readonly lookupTable: Uint16Array = CRC16.generateLookupTable();

  private static generateLookupTable(): Uint16Array {
    const table = new Uint16Array(256);
    for (let i = 0; i < 256; i++) {
      let curr = i << 8;
      for (let j = 0; j < 8; j++) {
        if ((curr & 0x8000) !== 0) {
          curr = ((curr << 1) ^ CRC16.POLYNOMIAL) & 0xffff;
        } else {
          curr = (curr << 1) & 0xffff;
        }
      }
      table[i] = curr;
    }
    return table;
  }

  /**
   * Computes CRC-16-CCITT for a given byte buffer
   */
  public static compute(data: Uint8Array, offset = 0, length = data.length): number {
    let crc = CRC16.INITIAL_VALUE;
    const end = Math.min(data.length, offset + length);

    for (let i = offset; i < end; i++) {
      const byte = data[i]!;
      const tableIndex = ((crc >> 8) ^ byte) & 0xff;
      crc = ((crc << 8) ^ CRC16.lookupTable[tableIndex]!) & 0xffff;
    }

    return crc;
  }

  /**
   * Appends 2-byte CRC16 (Big-Endian) to the end of packet buffer
   */
  public static appendChecksum(packetBuffer: Uint8Array): Uint8Array {
    const crc = CRC16.compute(packetBuffer);
    const result = new Uint8Array(packetBuffer.length + 2);
    result.set(packetBuffer, 0);
    result[packetBuffer.length] = (crc >> 8) & 0xff;
    result[packetBuffer.length + 1] = crc & 0xff;
    return result;
  }

  /**
   * Verifies the CRC16 checksum at the end of packet buffer
   * Returns true if valid, false if corrupted or bit-flipped
   */
  public static verifyChecksum(packetWithCrc: Uint8Array): boolean {
    if (packetWithCrc.length < 2) return false;
    const dataLen = packetWithCrc.length - 2;
    const expectedCrc = ((packetWithCrc[dataLen]! << 8) | packetWithCrc[dataLen + 1]!) & 0xffff;
    const actualCrc = CRC16.compute(packetWithCrc, 0, dataLen);
    return expectedCrc === actualCrc;
  }
}
