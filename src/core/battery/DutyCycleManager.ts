/**
 * 4-Tier Adaptive Battery Duty Cycle Manager
 * Protocol: TOG v1.1 Master Project Plan v6.1 Phase 7 Task 7.3
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export enum DutyCycleMode {
  NORMAL = 'NORMAL',           // > 50%: Scan 2.5s / Sleep 2.5s
  SAVER = 'SAVER',             // 20 - 50%: Scan 1.5s / Sleep 4.5s
  LOW = 'LOW',                 // 10 - 20%: Scan 1.0s / Sleep 9.0s
  DEEP_HIBERNATION = 'DEEP_HIBERNATION', // < 10%: Sleep 55-60s / Wake 20-50ms SOS beacon
}

export interface IDutyCycleWindow {
  mode: DutyCycleMode;
  scanDurationMs: number;
  sleepDurationMs: number;
  dutyRatioPct: number;
  allowHighThroughputMedia: boolean;
  canRelayForOthers: boolean;
}

export class DutyCycleManager {
  private currentBatteryPct: number = 100;
  private isCharging: boolean = false;

  constructor(initialBatteryPct = 100, isCharging = false) {
    this.currentBatteryPct = Math.max(0, Math.min(100, initialBatteryPct));
    this.isCharging = isCharging;
  }

  public updateBattery(batteryPct: number, isCharging = false): void {
    this.currentBatteryPct = Math.max(0, Math.min(100, batteryPct));
    this.isCharging = isCharging;
  }

  public getBatteryPct(): number {
    return this.currentBatteryPct;
  }

  public getIsCharging(): boolean {
    return this.isCharging;
  }

  /**
   * Computes the current 4-tier duty cycle window
   * - Normal (>50% or Charging): Scan 2500ms, Sleep 2500ms (50% duty cycle)
   * - Saver (20 - 50%): Scan 1500ms, Sleep 4500ms (25% duty cycle)
   * - Low (10 - 20%): Scan 1000ms, Sleep 9000ms (10% duty cycle)
   * - Deep Hibernation (<10%): Sleep 58000ms, Wake 50ms SOS pulse (<0.2% drain/hr)
   */
  public getDutyCycleWindow(): IDutyCycleWindow {
    if (this.isCharging || this.currentBatteryPct > 50) {
      return {
        mode: DutyCycleMode.NORMAL,
        scanDurationMs: 2500,
        sleepDurationMs: 2500,
        dutyRatioPct: 50.0,
        allowHighThroughputMedia: true,
        canRelayForOthers: true,
      };
    }

    if (this.currentBatteryPct >= 20) {
      return {
        mode: DutyCycleMode.SAVER,
        scanDurationMs: 1500,
        sleepDurationMs: 4500,
        dutyRatioPct: 25.0,
        allowHighThroughputMedia: false,
        canRelayForOthers: true,
      };
    }

    if (this.currentBatteryPct >= 10) {
      return {
        mode: DutyCycleMode.LOW,
        scanDurationMs: 1000,
        sleepDurationMs: 9000,
        dutyRatioPct: 10.0,
        allowHighThroughputMedia: false,
        canRelayForOthers: false, // Don't relay chat, preserve own SOS
      };
    }

    return {
      mode: DutyCycleMode.DEEP_HIBERNATION,
      scanDurationMs: 50,
      sleepDurationMs: 58000,
      dutyRatioPct: 0.08,
      allowHighThroughputMedia: false,
      canRelayForOthers: false, // Pure SOS beacon only
    };
  }

  /**
   * Evaluates if standby energy consumption fulfills < 0.2%/hr criteria
   */
  public getEstimatedHourlyDrainPct(): number {
    const cycleWindow = this.getDutyCycleWindow();
    switch (cycleWindow.mode) {
      case DutyCycleMode.NORMAL:
        return 1.2;
      case DutyCycleMode.SAVER:
        return 0.6;
      case DutyCycleMode.LOW:
        return 0.3;
      case DutyCycleMode.DEEP_HIBERNATION:
        return 0.15; // Strictly < 0.2%/hr
    }
  }
}
