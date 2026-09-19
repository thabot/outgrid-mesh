/**
 * Acoustic Morse Sound Beacon & Frequency Sweep Siren Engine
 * Emits audio beacon (Sweep Sine 800-1800Hz) penetrating rubble & sends Morse GPS
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Physical Signal Beacon
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export interface IMorseTone {
  frequency: number; // Hz
  durationMs: number;
  isSilence: boolean;
}

export class AcousticMorseEngine {
  public static readonly DOT_DURATION_MS = 100;
  public static readonly DASH_DURATION_MS = 300;
  public static readonly ELEMENT_GAP_MS = 100;
  public static readonly LETTER_GAP_MS = 300;
  public static readonly WORD_GAP_MS = 700;

  public static readonly MORSE_TABLE: Record<string, string> = {
    'A': '.-',    'B': '-...',  'C': '-.-.',  'D': '-..',
    'E': '.',     'F': '..-.',  'G': '--.',   'H': '....',
    'I': '..',    'J': '.---',  'K': '-.-',   'L': '.-..',
    'M': '--',    'N': '-.',    'O': '---',   'P': '.--.',
    'Q': '--.-',  'R': '.-.',   'S': '...',   'T': '-',
    'U': '..-',   'V': '...-',  'W': '.--',   'X': '-..-',
    'Y': '-.--',  'Z': '--..',
    '0': '-----', '1': '.----', '2': '..---', '3': '...--',
    '4': '....-', '5': '.....', '6': '-....', '7': '--...',
    '8': '---..', '9': '----.',
    '.': '.-.-.-', ',': '--..--', '-': '-....-', ' ': ' ',
  };

  /**
   * Encodes plain text message into sequence of Morse tone commands
   */
  public static encodeToMorseTones(text: string, toneFrequency = 1000): IMorseTone[] {
    const uppercase = text.toUpperCase();
    const tones: IMorseTone[] = [];

    for (let i = 0; i < uppercase.length; i++) {
      const char = uppercase[i];

      if (char === ' ') {
        tones.push({ frequency: 0, durationMs: AcousticMorseEngine.WORD_GAP_MS, isSilence: true });
        continue;
      }

      const pattern = AcousticMorseEngine.MORSE_TABLE[char];
      if (!pattern) continue;

      for (let p = 0; p < pattern.length; p++) {
        const symbol = pattern[p];
        const duration = symbol === '.' ? AcousticMorseEngine.DOT_DURATION_MS : AcousticMorseEngine.DASH_DURATION_MS;

        tones.push({ frequency: toneFrequency, durationMs: duration, isSilence: false });

        // Intra-character gap
        if (p < pattern.length - 1) {
          tones.push({ frequency: 0, durationMs: AcousticMorseEngine.ELEMENT_GAP_MS, isSilence: true });
        }
      }

      // Inter-character gap
      if (i < uppercase.length - 1 && uppercase[i + 1] !== ' ') {
        tones.push({ frequency: 0, durationMs: AcousticMorseEngine.LETTER_GAP_MS, isSilence: true });
      }
    }

    return tones;
  }

  /**
   * Generates Siren Sweep frequencies (800Hz to 1800Hz) penetrating rubble
   */
  public static generateSirenSweep(
    startFreq = 800,
    endFreq = 1800,
    sweepDurationMs = 1500,
    stepMs = 50
  ): IMorseTone[] {
    const steps = Math.floor(sweepDurationMs / stepMs);
    const tones: IMorseTone[] = [];
    const freqStep = (endFreq - startFreq) / steps;

    for (let i = 0; i <= steps; i++) {
      const freq = Math.round(startFreq + i * freqStep);
      tones.push({
        frequency: freq,
        durationMs: stepMs,
        isSilence: false,
      });
    }

    return tones;
  }
}
