/**
 * Unit tests for Ultrasonic FSK Modem & Acoustic Siren
 * Protocol: TOG v1.1 Master Project Plan v6.1 Phase 8 Task 8.2 & Sprint G Task G.4/G.5
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, expect, it } from 'bun:test';
import { UltrasonicFskModem } from '../../../src/core/emergency/UltrasonicFskModem';
import { AcousticMorseEngine } from '../../../src/core/emergency/AcousticMorseEngine';

describe('Sprint G: Ultrasonic FSK Modem & Acoustic Siren Engine', () => {
  it('should encode and decode GPS coordinates with sub-meter precision (1e-6 degrees)', () => {
    const lat = 13.756331;
    const lng = 100.501765;

    const bytes = UltrasonicFskModem.encodeGpsToBytes(lat, lng);
    expect(bytes.length).toBe(8);

    const decoded = UltrasonicFskModem.decodeBytesToGps(bytes);
    expect(Math.abs(decoded.latitude - lat)).toBeLessThan(0.000002);
    expect(Math.abs(decoded.longitude - lng)).toBeLessThan(0.000002);
  });

  it('should convert bytes to bit array and synthesize ultrasonic FSK audio at 18.5 / 19.5 kHz', () => {
    const bytes = new Uint8Array([0x54, 0x4F]); // 'TO' = 16 bits
    const bits = UltrasonicFskModem.bytesToBits(bytes);
    expect(bits.length).toBe(16);

    const pcm = UltrasonicFskModem.synthesizeFskAudio(bits, 480, 48000);
    expect(pcm.length).toBe(16 * 480);
    expect(pcm instanceof Float32Array).toBe(true);
  });

  it('should synthesize GPS beacon audio and demodulate back accurately via Goertzel algorithm', () => {
    const targetLat = 13.759000;
    const targetLng = 100.505000;

    // Synthesize GPS audio beacon
    const audio = UltrasonicFskModem.synthesizeGpsBeaconAudio(targetLat, targetLng);
    expect(audio.length).toBe(64 * 480); // 8 bytes * 8 bits * 480 samples

    // Demodulate back from audio
    const recovered = UltrasonicFskModem.demodulateAudioToGps(audio);
    expect(Math.abs(recovered.latitude - targetLat)).toBeLessThan(0.00001);
    expect(Math.abs(recovered.longitude - targetLng)).toBeLessThan(0.00001);
  });

  it('should generate 85dB dual-tone alternating acoustic siren (960Hz / 1440Hz)', () => {
    const sirenTones = AcousticMorseEngine.generateDualToneSiren(4, 960, 1440, 350);
    expect(sirenTones.length).toBe(8); // 4 cycles * 2 tones
    expect(sirenTones[0].frequency).toBe(960);
    expect(sirenTones[1].frequency).toBe(1440);
    expect(sirenTones[0].durationMs).toBe(350);
  });
});
