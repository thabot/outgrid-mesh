/**
 * Unit tests for DozeModeResilience
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, it, expect } from 'bun:test';
import { DozeModeResilience } from '../../../src/core/native/DozeModeResilience';

describe('DozeModeResilience (Deep Sleep & AlarmManager Wakeup)', () => {
  it('should track battery optimization whitelist status', () => {
    const doze = new DozeModeResilience();
    expect(doze.getIsBatteryOptimizationIgnored()).toBe(false);

    doze.setBatteryOptimizationIgnored(true);
    expect(doze.getIsBatteryOptimizationIgnored()).toBe(true);
  });

  it('should schedule AlarmManager wakeup configured with allowWhileIdle: true', () => {
    const doze = new DozeModeResilience(45000); // 45s interval
    const now = 100000;
    const alarm = doze.scheduleIdleWakeup(now);

    expect(alarm.allowWhileIdle).toBe(true);
    expect(alarm.triggerAtMillis).toBe(145000);
    expect(alarm.intervalMillis).toBe(45000);
    expect(doze.getNextScheduledAlarm()).toEqual(alarm);

    doze.cancelScheduledWakeup();
    expect(doze.getNextScheduledAlarm()).toBeNull();
  });
});
