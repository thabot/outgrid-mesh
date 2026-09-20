/**
 * Battery Runtime Estimator
 * Calculates estimated remaining battery lifetime based on dynamic hardware discharge rate
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Survival Power Model
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export interface IBatteryRuntimeEstimate {
  percentage: number;
  isCharging: boolean;
  estimatedHours: number;
  estimatedMinutes: number;
  formattedRemaining: string;
  isCriticalLastGasp: boolean;
}

export class BatteryRuntimeEstimator {
  // Baseline power draw per hour in regular mesh mode (~1.5% - 2.0% per hour)
  public static readonly BASELINE_DISCHARGE_RATE_PCT_HR = 1.8;
  
  // Power draw when Flashlight SOS strobe is running (~12% per hour)
  public static readonly STROBE_ADDITIONAL_PCT_HR = 10.2;

  // Power draw when Acoustic Siren is screaming (~8% per hour)
  public static readonly SIREN_ADDITIONAL_PCT_HR = 6.5;

  /**
   * Calculates remaining operational time given percentage and active high-drain hardware
   */
  public static estimateRuntime(
    percentage: number,
    isCharging: boolean,
    isFlashlightOn = false,
    isSirenOn = false
  ): IBatteryRuntimeEstimate {
    const clampedPct = Math.max(0, Math.min(100, percentage));
    const isCriticalLastGasp = clampedPct <= 5;

    if (isCharging) {
      return {
        percentage: clampedPct,
        isCharging: true,
        estimatedHours: 99,
        estimatedMinutes: 0,
        formattedRemaining: '⚡ กำลังชาร์จไฟ (ใช้งานได้ไม่จำกัด)',
        isCriticalLastGasp: false,
      };
    }

    let dischargeRate = this.BASELINE_DISCHARGE_RATE_PCT_HR;
    if (isFlashlightOn) dischargeRate += this.STROBE_ADDITIONAL_PCT_HR;
    if (isSirenOn) dischargeRate += this.SIREN_ADDITIONAL_PCT_HR;

    const totalHoursDecimal = clampedPct / dischargeRate;
    const estimatedHours = Math.floor(totalHoursDecimal);
    const estimatedMinutes = Math.round((totalHoursDecimal - estimatedHours) * 60);

    const formattedRemaining = isCriticalLastGasp
      ? `🚨 ${clampedPct}% วิกฤต (เหลือน้อยกว่า 30 นาที) - ส่ง Last-Gasp Beacon`
      : `🔋 ${clampedPct}% (ใช้ได้อีกประมาณ ${estimatedHours} ชม. ${estimatedMinutes} นาที)`;

    return {
      percentage: clampedPct,
      isCharging: false,
      estimatedHours,
      estimatedMinutes,
      formattedRemaining,
      isCriticalLastGasp,
    };
  }
}
