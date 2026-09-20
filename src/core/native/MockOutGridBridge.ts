/**
 * Mock Android Native Bridge for Browser Development & Automated Unit Testing
 * Implements the full contract of OutGridAndroidBridge.kt
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Native Bridge Specification
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export interface IBatteryInfoPayload {
  level: number;
  isCharging: boolean;
  temperature: number;
  voltage: number;
}

export interface ICompassOrientationPayload {
  azimuth: number;
  pitch: number;
  roll: number;
  accuracy: number;
}

export interface IBarometerAltitudePayload {
  pressureHpa: number;
  relativeAltitudeMeters: number;
}

export class MockOutGridBridge {
  private torchEnabled: boolean = false;
  private sosStrobeActive: boolean = false;
  private batteryInfo: IBatteryInfoPayload = {
    level: 78,
    isCharging: false,
    temperature: 32.5,
    voltage: 3950,
  };
  private isBatteryOptimizationExempt: boolean = false;
  private hotspotRunning: boolean = false;
  private screenAwake: boolean = false;
  private lastVibratedPattern: boolean = false;
  private compassOrientation: ICompassOrientationPayload = {
    azimuth: 45.0,
    pitch: 0.0,
    roll: 0.0,
    accuracy: 3,
  };
  private barometerAltitude: IBarometerAltitudePayload = {
    pressureHpa: 1013.25,
    relativeAltitudeMeters: 0.0,
  };

  public toggleTorch(enabled: boolean): boolean {
    this.torchEnabled = enabled;
    if (!enabled) this.sosStrobeActive = false;
    return true;
  }

  public startSosStrobe(): boolean {
    this.torchEnabled = true;
    this.sosStrobeActive = true;
    return true;
  }

  public stopTorch(): boolean {
    this.torchEnabled = false;
    this.sosStrobeActive = false;
    return true;
  }

  public getBatteryInfo(): string {
    return JSON.stringify(this.batteryInfo);
  }

  public setMockBattery(info: Partial<IBatteryInfoPayload>): void {
    this.batteryInfo = { ...this.batteryInfo, ...info };
  }

  public requestBatteryOptimizationExemption(): boolean {
    this.isBatteryOptimizationExempt = true;
    return true;
  }

  public isIgnoringBatteryOptimizations(): boolean {
    return this.isBatteryOptimizationExempt;
  }

  public shareApkFile(): boolean {
    return true; // Simulates Intent trigger
  }

  public startApkHotspot(): string {
    this.hotspotRunning = true;
    return 'http://192.168.49.1:8080/app.apk';
  }

  public stopApkHotspot(): boolean {
    this.hotspotRunning = false;
    return true;
  }

  public wakeScreenForEmergency(): boolean {
    this.screenAwake = true;
    return true;
  }

  public vibrateSosPattern(): boolean {
    this.lastVibratedPattern = true;
    return true;
  }

  public getCompassOrientation(): string {
    return JSON.stringify(this.compassOrientation);
  }

  public setMockCompass(orientation: Partial<ICompassOrientationPayload>): void {
    this.compassOrientation = { ...this.compassOrientation, ...orientation };
  }

  public getBarometerAltitude(): string {
    return JSON.stringify(this.barometerAltitude);
  }

  public setMockBarometer(barometer: Partial<IBarometerAltitudePayload>): void {
    this.barometerAltitude = { ...this.barometerAltitude, ...barometer };
  }

  // Getters for assertion in tests
  public isTorchOn(): boolean {
    return this.torchEnabled;
  }

  public isSosStrobeOn(): boolean {
    return this.sosStrobeActive;
  }

  public isHotspotActive(): boolean {
    return this.hotspotRunning;
  }

  public isScreenAwake(): boolean {
    return this.screenAwake;
  }
}
