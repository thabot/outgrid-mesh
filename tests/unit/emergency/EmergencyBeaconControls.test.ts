/**
 * Unit tests for EmergencyBeaconControls (Sprint C Task C.4)
 * Verifies panic beacon coordination, siren frequency alternation, and 5-min thermal safety cutoff
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Survival Beacons
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { EmergencyBeaconControls } from '../../../src/core/emergency/EmergencyBeaconControls';

describe('EmergencyBeaconControls (Sprint C Task C.4 Emergency Hardware & Thermal Cutoff)', () => {
  let controls: EmergencyBeaconControls;

  beforeEach(() => {
    controls = new EmergencyBeaconControls();
  });

  it('should engage both flashlight and siren when panic beacon is triggered', () => {
    expect(controls.isTorchOn()).toBe(false);
    expect(controls.isSirenOn()).toBe(false);

    controls.startPanicBeacon();
    expect(controls.isTorchOn()).toBe(true);
    expect(controls.isSirenOn()).toBe(true);

    controls.stopAllBeacons();
    expect(controls.isTorchOn()).toBe(false);
    expect(controls.isSirenOn()).toBe(false);
  });

  it('should alternate siren frequencies between 960 Hz and 1440 Hz penetration tones', () => {
    expect(controls.getSirenFrequency()).toBe(EmergencyBeaconControls.SIREN_FREQ_LOW);

    const freq2 = controls.cycleSirenTone();
    expect(freq2).toBe(EmergencyBeaconControls.SIREN_FREQ_HIGH);

    const freq3 = controls.cycleSirenTone();
    expect(freq3).toBe(EmergencyBeaconControls.SIREN_FREQ_LOW);
  });

  it('should support instant mute toggle for acoustic siren', () => {
    controls.startAcousticSiren();
    expect(controls.isSirenMuted()).toBe(false);

    controls.toggleMute();
    expect(controls.isSirenMuted()).toBe(true);

    controls.toggleMute();
    expect(controls.isSirenMuted()).toBe(false);
  });

  it('should automatically trigger thermal cutoff when flashlight runs continuous 5 minutes', () => {
    const startTime = 1000000;
    controls.startFlashlightMorse(startTime);
    expect(controls.isTorchOn()).toBe(true);

    // 4 minutes (240,000ms) -> Still on
    const check1 = controls.checkThermalCutoff(startTime + 240000);
    expect(check1).toBe(false);
    expect(controls.isTorchOn()).toBe(true);

    // 5 minutes (300,000ms) -> Cutoff triggered
    const check2 = controls.checkThermalCutoff(startTime + 300000);
    expect(check2).toBe(true);
    expect(controls.isTorchOn()).toBe(false);
  });
});
