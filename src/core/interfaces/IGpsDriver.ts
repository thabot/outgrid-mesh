/**
 * Hexagonal Port: GPS / Geolocation Driver Interface
 * Protocol: TOG v1.1 Pure Domain Port
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export interface IGpsCoordinates {
  latitude: number;
  longitude: number;
  altitudeMeters?: number;
  accuracyMeters: number;
  speedMetersPerSecond?: number;
  bearingDegrees?: number;
  timestamp: number;
}

export type GpsUpdateCallback = (coords: IGpsCoordinates) => void;

export interface IGpsDriver {
  /** Driver identifier (e.g., 'ANDROID_FUSED_LOCATION', 'WEB_GEOLOCATION', 'MOCK_GPS') */
  readonly driverName: string;

  /** Initialize location provider */
  initialize(): Promise<boolean>;

  /** Obtain the current best known location */
  getCurrentPosition(): Promise<IGpsCoordinates>;

  /** Start tracking continuous location changes */
  startTracking(onUpdate: GpsUpdateCallback, intervalMs?: number): Promise<void>;

  /** Stop tracking location changes */
  stopTracking(): Promise<void>;

  /** Check if location services and permissions are available */
  isAvailable(): boolean;
}
