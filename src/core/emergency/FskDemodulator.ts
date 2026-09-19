/**
 * Ultrasonic & FSK Demodulator
 * Goertzel Algorithm for dual-frequency FSK tone detection (18.5 kHz / 19.5 kHz)
 * Demodulates acoustic beacon signals into binary bytes and coordinates
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Acoustic Sub-Surface Rescue
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export class FskDemodulator {
  public static readonly FREQ_MARK_1 = 18500;  // 18.5 kHz = Bit '1'
  public static readonly FREQ_SPACE_0 = 19500; // 19.5 kHz = Bit '0'
  public static readonly SAMPLE_RATE = 48000;  // Standard 48 kHz mic audio

  /**
   * Goertzel algorithm to compute magnitude of a target frequency in sample block
   */
  public static goertzelMagnitude(samples: Float32Array, targetFreq: number, sampleRate = FskDemodulator.SAMPLE_RATE): number {
    const n = samples.length;
    const k = Math.round((n * targetFreq) / sampleRate);
    const omega = (2 * Math.PI * k) / n;
    const coeff = 2 * Math.cos(omega);

    let q0 = 0;
    let q1 = 0;
    let q2 = 0;

    for (let i = 0; i < n; i++) {
      q0 = coeff * q1 - q2 + samples[i];
      q2 = q1;
      q1 = q0;
    }

    return Math.sqrt(q1 * q1 + q2 * q2 - q1 * q2 * coeff);
  }

  /**
   * Classifies sample block into bit '1', '0', or null (noise/silence)
   */
  public static detectBit(
    samples: Float32Array,
    thresholdRatio = 1.5,
    minMagnitude = 10.0
  ): '1' | '0' | null {
    const mag1 = FskDemodulator.goertzelMagnitude(samples, FskDemodulator.FREQ_MARK_1);
    const mag0 = FskDemodulator.goertzelMagnitude(samples, FskDemodulator.FREQ_SPACE_0);

    if (mag1 < minMagnitude && mag0 < minMagnitude) {
      return null;
    }

    if (mag1 > mag0 * thresholdRatio) {
      return '1';
    }

    if (mag0 > mag1 * thresholdRatio) {
      return '0';
    }

    return null; // Ambiguous
  }

  /**
   * Demodulates an array of detected bits into binary Uint8Array
   */
  public static bitsToBytes(bits: ('1' | '0')[]): Uint8Array {
    const byteCount = Math.floor(bits.length / 8);
    const bytes = new Uint8Array(byteCount);

    for (let i = 0; i < byteCount; i++) {
      let byteVal = 0;
      for (let bitIdx = 0; bitIdx < 8; bitIdx++) {
        const bit = bits[i * 8 + bitIdx];
        if (bit === '1') {
          byteVal |= (1 << (7 - bitIdx));
        }
      }
      bytes[i] = byteVal;
    }

    return bytes;
  }
}
