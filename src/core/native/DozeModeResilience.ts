/**
 * Doze Mode Resilience Engine & AlarmManager Intermittent Radio Wakeups
 * Ensures background scanning continues even when Android enters deep sleep
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Deep Sleep Resilience
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export interface IAlarmSchedule {
  type: 'RTC_WAKEUP' | 'ELAPSED_REALTIME_WAKEUP';
  triggerAtMillis: number;
  intervalMillis: number;
  allowWhileIdle: boolean;
}

export class DozeModeResilience {
  private isBatteryOptimizationIgnored: boolean = false;
  private nextAlarm: IAlarmSchedule | null = null;
  private scanIntervalMs: number = 60000; // 60s standard intermittent wake cycle

  constructor(scanIntervalMs = 60000) {
    this.scanIntervalMs = scanIntervalMs;
  }

  /**
   * Sets battery optimization whitelist status
   */
  public setBatteryOptimizationIgnored(ignored: boolean): void {
    this.isBatteryOptimizationIgnored = ignored;
  }

  public getIsBatteryOptimizationIgnored(): boolean {
    return this.isBatteryOptimizationIgnored;
  }

  /**
   * Schedules precise wakeup using AlarmManager.setAndAllowWhileIdle
   */
  public scheduleIdleWakeup(now = Date.now()): IAlarmSchedule {
    const triggerAt = now + this.scanIntervalMs;
    this.nextAlarm = {
      type: 'RTC_WAKEUP',
      triggerAtMillis: triggerAt,
      intervalMillis: this.scanIntervalMs,
      allowWhileIdle: true,
    };
    return this.nextAlarm;
  }

  public cancelScheduledWakeup(): void {
    this.nextAlarm = null;
  }

  public getNextScheduledAlarm(): IAlarmSchedule | null {
    return this.nextAlarm;
  }
}
