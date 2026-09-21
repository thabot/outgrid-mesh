/**
 * Ultrasonic FSK Modem (18.5 kHz / 19.5 kHz)
 * Synthesizes and demodulates high-frequency sub-surface acoustic beacons penetrating building rubble
 * Protocol: TOG v1.1 Master Project Plan v6.1 Phase 8 Task 8.2 & Sprint G Task G.4
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { FskDemodulator } from './FskDemodulator';

export interface IGpsCoordinatePayload {
  latitude: number;
  longitude: number;
  timestamp?: number;
}

export class UltrasonicFskModem {
  public static readonly MARK_FREQ_HZ = 18500;  // 18.5 kHz = Bit '1'
  public static readonly SPACE_FREQ_HZ = 19500; // 19.5 kHz = Bit '0'
  public static readonly DEFAULT_SAMPLE_RATE = 48000;
  public static readonly SAMPLES_PER_BIT = 480; // 10ms per bit at 48kHz (100 Baud)

  /**
   * Encodes GPS latitude and longitude into binary byte frame (8 Bytes: 4B Lat + 4B Lng as int32 1e6 precision)
   */
  public static encodeGpsToBytes(lat: number, lng: number): Uint8Array {
    const buffer = new Uint8Array(8);
    const view = new DataView(buffer.buffer);
    // int32 scaled by 1e6 (-180.0 to +180.0 fits in signed 32-bit: -180,000,000 to +180,000,000)
    const latScaled = Math.round(lat * 1_000_000);
    const lngScaled = Math.round(lng * 1_000_000);
    view.setInt32(0, latScaled, false);
    view.setInt32(4, lngScaled, false);
    return buffer;
  }

  /**
   * Decodes binary byte frame back to GPS latitude and longitude
   */
  public static decodeBytesToGps(bytes: Uint8Array): IGpsCoordinatePayload {
    if (bytes.length < 8) {
      throw new Error(`Invalid GPS byte frame length: ${bytes.length} < 8`);
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const latScaled = view.getInt32(0, false);
    const lngScaled = view.getInt32(4, false);
    return {
      latitude: latScaled / 1_000_000,
      longitude: lngScaled / 1_000_000
    };
  }

  /**
   * Converts bytes into an array of bit characters ('1' | '0')
   */
  public static bytesToBits(bytes: Uint8Array): ('1' | '0')[] {
    const bits: ('1' | '0')[] = [];
    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i];
      for (let bitIdx = 7; bitIdx >= 0; bitIdx--) {
        bits.push(((b >> bitIdx) & 1) === 1 ? '1' : '0');
      }
    }
    return bits;
  }

  /**
   * Synthesizes PCM Float32Array sine wave audio for a sequence of bits
   */
  public static synthesizeFskAudio(
    bits: ('1' | '0')[],
    samplesPerBit = UltrasonicFskModem.SAMPLES_PER_BIT,
    sampleRate = UltrasonicFskModem.DEFAULT_SAMPLE_RATE
  ): Float32Array {
    const totalSamples = bits.length * samplesPerBit;
    const output = new Float32Array(totalSamples);

    for (let i = 0; i < bits.length; i++) {
      const bit = bits[i];
      const freq = bit === '1' ? UltrasonicFskModem.MARK_FREQ_HZ : UltrasonicFskModem.SPACE_FREQ_HZ;
      const offset = i * samplesPerBit;

      for (let s = 0; s < samplesPerBit; s++) {
        const t = (offset + s) / sampleRate;
        output[offset + s] = Math.sin(2 * Math.PI * freq * t);
      }
    }

    return output;
  }

  /**
   * Synthesizes ultrasonic audio directly from GPS coordinates
   */
  public static synthesizeGpsBeaconAudio(
    lat: number,
    lng: number,
    samplesPerBit = UltrasonicFskModem.SAMPLES_PER_BIT,
    sampleRate = UltrasonicFskModem.DEFAULT_SAMPLE_RATE
  ): Float32Array {
    const bytes = UltrasonicFskModem.encodeGpsToBytes(lat, lng);
    const bits = UltrasonicFskModem.bytesToBits(bytes);
    return UltrasonicFskModem.synthesizeFskAudio(bits, samplesPerBit, sampleRate);
  }

  /**
   * Demodulates audio stream back into GPS coordinates using Goertzel algorithm
   */
  public static demodulateAudioToGps(
    audioSamples: Float32Array,
    samplesPerBit = UltrasonicFskModem.SAMPLES_PER_BIT
  ): IGpsCoordinatePayload {
    const bitCount = Math.floor(audioSamples.length / samplesPerBit);
    const bits: ('1' | '0')[] = [];

    for (let i = 0; i < bitCount; i++) {
      const block = audioSamples.subarray(i * samplesPerBit, (i + 1) * samplesPerBit);
      const bit = FskDemodulator.detectBit(block);
      bits.push(bit ?? '0');
    }

    const bytes = FskDemodulator.bitsToBytes(bits);
    return UltrasonicFskModem.decodeBytesToGps(bytes);
  }
}
