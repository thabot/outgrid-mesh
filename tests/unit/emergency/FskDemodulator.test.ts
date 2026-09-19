/**
 * Unit tests for FskDemodulator
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, it, expect } from 'bun:test';
import { FskDemodulator } from '../../../src/core/emergency/FskDemodulator';

describe('FskDemodulator (Ultrasonic / FSK Sub-Surface Rescue)', () => {
  const sampleRate = 48000;
  const blockSize = 480; // 10ms per bit

  function generateSineWave(freq: number, length: number): Float32Array {
    const arr = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      arr[i] = Math.sin((2 * Math.PI * freq * i) / sampleRate);
    }
    return arr;
  }

  it('should detect Bit 1 when receiving 18.5 kHz sine wave', () => {
    const markSamples = generateSineWave(18500, blockSize);
    const bit = FskDemodulator.detectBit(markSamples);
    expect(bit).toBe('1');
  });

  it('should detect Bit 0 when receiving 19.5 kHz sine wave', () => {
    const spaceSamples = generateSineWave(19500, blockSize);
    const bit = FskDemodulator.detectBit(spaceSamples);
    expect(bit).toBe('0');
  });

  it('should return null for background silence or out-of-band noise', () => {
    const silentSamples = new Float32Array(blockSize);
    expect(FskDemodulator.detectBit(silentSamples)).toBeNull();

    const lowVoiceSamples = generateSineWave(500, blockSize); // 500Hz normal voice
    expect(FskDemodulator.detectBit(lowVoiceSamples)).toBeNull();
  });

  it('should convert demodulated bit sequence into exact bytes', () => {
    // 0x54 ('T') = 01010100
    // 0x4F ('O') = 01001111
    const bits: ('1' | '0')[] = [
      '0', '1', '0', '1', '0', '1', '0', '0', // 0x54
      '0', '1', '0', '0', '1', '1', '1', '1', // 0x4F
    ];

    const bytes = FskDemodulator.bitsToBytes(bits);
    expect(bytes.length).toBe(2);
    expect(bytes[0]).toBe(0x54);
    expect(bytes[1]).toBe(0x4F);
  });
});
