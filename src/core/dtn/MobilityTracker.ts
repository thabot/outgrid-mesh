/**
 * Mobility & Velocity Azimuth Tracker
 * Protocol: TOG v1.1 Master Project Plan v6.1 Phase 6 Task 6.2
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export interface IGpsFix {
  latitude: number;
  longitude: number;
  speedKmh: number;
  bearingDeg: number;
  timestamp: number;
}

export class MobilityTracker {
  private static readonly MULE_SPEED_MIN_KMH = 20.0;
  private static readonly MULE_SPEED_MAX_KMH = 80.0;
  private static readonly DATA_MULE_TRIGGER_SPEED_KMH = 15.0;
  private static readonly DATA_MULE_SUSTAINED_MS = 30000; // 30 seconds

  private recentFixes: IGpsFix[] = [];
  private sustainedMotionStartTime: number | null = null;
  private isMuleRoleActive: boolean = false;

  public addFix(fix: IGpsFix): void {
    this.recentFixes.push(fix);
    if (this.recentFixes.length > 10) {
      this.recentFixes.shift();
    }
    this.evaluateMuleState(fix.speedKmh, fix.timestamp);
  }

  /**
   * Updates motion state using either GPS speed or accelerometer estimation
   */
  public updateMotion(speedKmh: number, accelMps2 = 0, timestamp: number = Date.now()): void {
    // If significant accelerometer motion detected, combine with speed
    const effectiveSpeed = accelMps2 > 1.5 && speedKmh < 5 ? 15.0 : speedKmh;
    this.evaluateMuleState(effectiveSpeed, timestamp);
  }

  private evaluateMuleState(speedKmh: number, timestamp: number): void {
    if (speedKmh >= MobilityTracker.DATA_MULE_TRIGGER_SPEED_KMH) {
      if (this.sustainedMotionStartTime === null) {
        this.sustainedMotionStartTime = timestamp;
      } else if (timestamp - this.sustainedMotionStartTime >= MobilityTracker.DATA_MULE_SUSTAINED_MS) {
        this.isMuleRoleActive = true;
      }
    } else {
      this.sustainedMotionStartTime = null;
      if (speedKmh <= 2.0) {
        this.isMuleRoleActive = false;
      }
    }
  }

  /**
   * Returns true if device is currently classified as DATA_MULE_ACTIVE
   */
  public isDataMuleActive(): boolean {
    return this.isMuleRoleActive || this.isHighPriorityMule();
  }

  /**
   * Returns true if device has stopped or is stationary (0 km/h)
   */
  public isStationary(): boolean {
    if (this.recentFixes.length === 0) return true;
    const latest = this.recentFixes[this.recentFixes.length - 1];
    return latest.speedKmh < 1.0;
  }

  /**
   * Forcefully overrides Data Mule active state (e.g. for simulations or emergency dispatch)
   */
  public setDataMuleActive(active: boolean): void {
    this.isMuleRoleActive = active;
  }

  /**
   * Determines if device qualifies as High-Priority Data Mule (20 - 80 km/h)
   */
  public isHighPriorityMule(): boolean {
    if (this.recentFixes.length === 0) return false;
    const latest = this.recentFixes[this.recentFixes.length - 1];
    return latest.speedKmh >= MobilityTracker.MULE_SPEED_MIN_KMH &&
           latest.speedKmh <= MobilityTracker.MULE_SPEED_MAX_KMH;
  }

  /**
   * Calculates azimuth projection angle
   */
  public getCurrentBearing(): number {
    if (this.recentFixes.length === 0) return 0;
    return this.recentFixes[this.recentFixes.length - 1].bearingDeg;
  }
}

