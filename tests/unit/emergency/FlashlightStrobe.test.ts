/**
 * Unit tests for FlashlightStrobe
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { FlashlightStrobe } from '../../../src/core/emergency/FlashlightStrobe';

describe('FlashlightStrobe (Optical Morse SOS & Thermal Cutoff)', () => {
  let strobe: FlashlightStrobe;

  beforeEach(() => {
    strobe = new FlashlightStrobe();
  });

  it('should generate exact Morse SOS sequence (... --- ...)', () => {
    const pattern = FlashlightStrobe.generateSosPattern();
    const litFlases = pattern.filter(p => p.isOn);

    expect(litFlases.length).toBe(9); // 3 dots, 3 dashes, 3 dots
    expect(litFlases[0].durationMs).toBe(FlashlightStrobe.DOT_DURATION_MS);
    expect(litFlases[1].durationMs).toBe(FlashlightStrobe.DOT_DURATION_MS);
    expect(litFlases[2].durationMs).toBe(FlashlightStrobe.DOT_DURATION_MS);

    expect(litFlases[3].durationMs).toBe(FlashlightStrobe.DASH_DURATION_MS);
    expect(litFlases[4].durationMs).toBe(FlashlightStrobe.DASH_DURATION_MS);
    expect(litFlases[5].durationMs).toBe(FlashlightStrobe.DASH_DURATION_MS);

    expect(litFlases[6].durationMs).toBe(FlashlightStrobe.DOT_DURATION_MS);
    expect(litFlases[7].durationMs).toBe(FlashlightStrobe.DOT_DURATION_MS);
    expect(litFlases[8].durationMs).toBe(FlashlightStrobe.DOT_DURATION_MS);
  });

  it('should trigger thermal cutoff after maximum continuous strobe duration', () => {
    const startTime = 1000000;
    expect(strobe.startStrobe(startTime)).toBe(true);

    // After 2 minutes (120s) -> should still be active
    const check1 = strobe.updateStrobeTick(startTime + 120000);
    expect(check1.active).toBe(true);
    expect(check1.isThermalCutoff).toBe(false);

    // After 3 minutes (180s) -> should trigger thermal cutoff
    const check2 = strobe.updateStrobeTick(startTime + 180000);
    expect(check2.active).toBe(false);
    expect(check2.isThermalCutoff).toBe(true);
    expect(strobe.getIsStrobing()).toBe(false);
  });

  it('should prevent restart during thermal cooldown period', () => {
    const startTime = 1000000;
    strobe.startStrobe(startTime);
    strobe.updateStrobeTick(startTime + 180000); // Triggers cutoff

    // Immediate attempt to restart after 10s (within 30s cooldown) -> Rejected
    const restartImmediate = strobe.startStrobe(startTime + 190000);
    expect(restartImmediate).toBe(false);

    // Attempt after 35s (cooldown finished) -> Accepted
    const restartAfterCooldown = strobe.startStrobe(startTime + 215000);
    expect(restartAfterCooldown).toBe(true);
  });
});
