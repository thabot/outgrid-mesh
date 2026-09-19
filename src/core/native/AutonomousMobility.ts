/**
 * Autonomous Mobility Detection Engine
 * Detects vehicle speed (>= 15-20 km/h) via Accelerometer & GPS
 * Automatically activates Physical Data Mule mode
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Autonomous Mobility
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export interface IMobilitySample {
  timestamp: number;
  speedKmh?: number;     // From GPS if available
  accelMagnitude?: number; // m/s^2 from accelerometer
}

export class AutonomousMobility {
  public static readonly VEHICLE_SPEED_THRESHOLD_KMH = 18; // 18 km/h
  public static readonly HIGH_MOBILITY_WINDOW_SAMPLES = 5;

  private samples: IMobilitySample[] = [];
  private isDataMuleActive: boolean = false;

  /**
   * Records a mobility sensor reading (GPS speed or Accelerometer)
   */
  public addSample(sample: IMobilitySample): boolean {
    this.samples.push(sample);
    if (this.samples.length > AutonomousMobility.HIGH_MOBILITY_WINDOW_SAMPLES) {
      this.samples.shift();
    }

    // Evaluate mobility state
    const wasActive = this.isDataMuleActive;
    this.evaluateMobility();
    return this.isDataMuleActive !== wasActive; // Returns true if state transitioned
  }

  /**
   * Evaluates recent window to determine if node is moving via vehicle
   */
  private evaluateMobility(): void {
    if (this.samples.length === 0) {
      this.isDataMuleActive = false;
      return;
    }

    // Calculate average speed if GPS speed reported
    const speedSamples = this.samples.filter(s => s.speedKmh !== undefined);
    if (speedSamples.length >= 3) {
      const avgSpeed = speedSamples.reduce((acc, s) => acc + (s.speedKmh || 0), 0) / speedSamples.length;
      if (avgSpeed >= AutonomousMobility.VEHICLE_SPEED_THRESHOLD_KMH) {
        this.isDataMuleActive = true;
        return;
      } else {
        this.isDataMuleActive = false;
        return;
      }
    }

    // Fallback: If only accelerometer is available, high continuous variance indicates motion
    const accelSamples = this.samples.filter(s => s.accelMagnitude !== undefined);
    if (accelSamples.length >= 3) {
      const highAccelCount = accelSamples.filter(s => (s.accelMagnitude || 0) > 13.0).length;
      this.isDataMuleActive = highAccelCount >= 3;
      return;
    }

    this.isDataMuleActive = false;
  }

  public getIsDataMuleActive(): boolean {
    return this.isDataMuleActive;
  }

  public forceDataMuleMode(active: boolean): void {
    this.isDataMuleActive = active;
  }
}
