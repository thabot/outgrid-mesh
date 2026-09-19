/**
 * Battery Policy Manager
 * Adaptive mesh duty cycle and UI guidance based on remaining battery level
 * Full Power (>50%), Balanced (20-50%), Deep Hibernation (<20%)
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Energy Preservation Policy
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export enum BatteryTier {
  FULL_POWER = 'FULL_POWER',         // > 50%
  BALANCED = 'BALANCED',             // 20% - 50%
  DEEP_HIBERNATION = 'DEEP_HIBERNATION', // < 20%
}

export interface IBatteryPolicy {
  tier: BatteryTier;
  scanIntervalSec: number;
  scanDurationSec: number;
  allowHighThroughputMedia: boolean;
  uiGuidanceNotice: string;
}

export class BatteryPolicyManager {
  private batteryPercentage: number = 100;
  private isCharging: boolean = false;

  constructor(initialBattery = 100, isCharging = false) {
    this.batteryPercentage = initialBattery;
    this.isCharging = isCharging;
  }

  public updateBattery(percentage: number, isCharging: boolean): void {
    this.batteryPercentage = Math.max(0, Math.min(100, percentage));
    this.isCharging = isCharging;
  }

  public getBatteryPercentage(): number {
    return this.batteryPercentage;
  }

  public getIsCharging(): boolean {
    return this.isCharging;
  }

  /**
   * Derives runtime policy based on current power level
   */
  public getPolicy(): IBatteryPolicy {
    if (this.isCharging || this.batteryPercentage > 50) {
      return {
        tier: BatteryTier.FULL_POWER,
        scanIntervalSec: 60,
        scanDurationSec: 5,
        allowHighThroughputMedia: true,
        uiGuidanceNotice: '🔋 แบตเตอรี่เพียงพอ ทำงานระบบ Mesh เต็มประสิทธิภาพ',
      };
    }

    if (this.batteryPercentage >= 20) {
      return {
        tier: BatteryTier.BALANCED,
        scanIntervalSec: 120,
        scanDurationSec: 3,
        allowHighThroughputMedia: false,
        uiGuidanceNotice: '⚠️ แบตเตอรี่ปานกลาง ปิดรับรูปภาพขนาดใหญ่เพื่อประหยัดพลังงาน',
      };
    }

    return {
      tier: BatteryTier.DEEP_HIBERNATION,
      scanIntervalSec: 300,
      scanDurationSec: 2,
      allowHighThroughputMedia: false,
      uiGuidanceNotice: '🛑 แบตเตอรี่วิกฤต (<20%) เข้าสู่โหมดจำศีลวิทยุ สแตนด์บายเฉพาะสัญญาณ SOS เท่านั้น',
    };
  }
}
