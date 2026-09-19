/**
 * Unit tests for AcousticMorseEngine
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, it, expect } from 'bun:test';
import { AcousticMorseEngine } from '../../../src/core/emergency/AcousticMorseEngine';

describe('AcousticMorseEngine (Acoustic Rubble Beacon)', () => {
  it('should encode SOS correctly into standard Morse audio sequence', () => {
    const tones = AcousticMorseEngine.encodeToMorseTones('SOS', 1200);

    // Filter sound tones (non-silence)
    const soundTones = tones.filter(t => !t.isSilence);
    expect(soundTones.length).toBe(9); // 3 dots (S) + 3 dashes (O) + 3 dots (S)

    // Verify durations: S (100, 100, 100), O (300, 300, 300), S (100, 100, 100)
    expect(soundTones[0].durationMs).toBe(100);
    expect(soundTones[1].durationMs).toBe(100);
    expect(soundTones[2].durationMs).toBe(100);
    expect(soundTones[3].durationMs).toBe(300);
    expect(soundTones[4].durationMs).toBe(300);
    expect(soundTones[5].durationMs).toBe(300);
    expect(soundTones[6].durationMs).toBe(100);
    expect(soundTones[7].durationMs).toBe(100);
    expect(soundTones[8].durationMs).toBe(100);

    for (const t of soundTones) {
      expect(t.frequency).toBe(1200);
    }
  });

  it('should generate continuous frequency sweep between 800Hz and 1800Hz', () => {
    const sweep = AcousticMorseEngine.generateSirenSweep(800, 1800, 1000, 100);
    expect(sweep.length).toBe(11); // 0 to 10 steps

    expect(sweep[0].frequency).toBe(800);
    expect(sweep[sweep.length - 1].frequency).toBe(1800);
    expect(sweep[0].isSilence).toBe(false);
  });
});
