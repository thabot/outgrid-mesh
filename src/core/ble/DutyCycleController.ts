/**
 * Battery-Aware Duty Cycle Controller
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Power Management
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export enum BatteryTier {
  TIER_NORMAL = 'normal',       // Battery > 50%
  TIER_ECO = 'eco',             // Battery 20% - 50%
  TIER_DEEP_SLEEP = 'deep_sleep' // Battery < 20%
}

export interface IDutyCycleWindow {
  tier: BatteryTier;
  scanDurationMs: number;
  sleepDurationMs: number;
  dutyRatioPct: number;
}

export class DutyCycleController {
  /**
   * Returns duty cycling scan and sleep window based on battery percentage
   * - Normal (>50%): Scan 5s, Sleep 55s (8.3% duty cycle)
   * - Eco (20-50%): Scan 3s, Sleep 120s (2.4% duty cycle)
   * - Deep Sleep (<20%): Scan 2s, Sleep 300s (0.6% duty cycle, preserves life for days)
   */
  public static getDutyCycle(batteryPct: number, isPluggedIn = false): IDutyCycleWindow {
    if (isPluggedIn) {
      return {
        tier: BatteryTier.TIER_NORMAL,
        scanDurationMs: 10000,
        sleepDurationMs: 10000, // 50% continuous scan when plugged in
        dutyRatioPct: 50
      };
    }

    if (batteryPct > 50) {
      return {
        tier: BatteryTier.TIER_NORMAL,
        scanDurationMs: 5000,
        sleepDurationMs: 55000,
        dutyRatioPct: Math.round((5000 / 60000) * 100)
      };
    } else if (batteryPct >= 20) {
      return {
        tier: BatteryTier.TIER_ECO,
        scanDurationMs: 3000,
        sleepDurationMs: 120000,
        dutyRatioPct: Number(((3000 / 123000) * 100).toFixed(1))
      };
    } else {
      return {
        tier: BatteryTier.TIER_DEEP_SLEEP,
        scanDurationMs: 2000,
        sleepDurationMs: 300000,
        dutyRatioPct: Number(((2000 / 302000) * 100).toFixed(2))
      };
    }
  }
}
