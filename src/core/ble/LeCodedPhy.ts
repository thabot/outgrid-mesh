/**
 * Bluetooth 5 LE Coded PHY (S=8 / S=2) Negotiation & Range Driver
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Long Range Radio
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

export enum BlePhyType {
  PHY_LE_1M = 1,      // Standard BLE 1Mbps (~50-80m)
  PHY_LE_2M = 2,      // High speed 2Mbps
  PHY_LE_CODED = 3    // Long Range Coded PHY (~200-500m)
}

export enum LeCodedScheme {
  S2 = 2, // 500 kbps (x2 range)
  S8 = 8  // 125 kbps (x4 range, maximum disaster penetration)
}

export interface IPhyCapabilities {
  supportsLeCodedPhy: boolean;
  supportsExtendedAdvertising: boolean;
  maxTxPowerDbm: number;
}

export class LeCodedPhy {
  private currentPhy: BlePhyType;
  private currentScheme: LeCodedScheme;
  private capabilities: IPhyCapabilities;

  constructor(capabilities?: Partial<IPhyCapabilities>) {
    this.capabilities = {
      supportsLeCodedPhy: capabilities?.supportsLeCodedPhy ?? true,
      supportsExtendedAdvertising: capabilities?.supportsExtendedAdvertising ?? true,
      maxTxPowerDbm: capabilities?.maxTxPowerDbm ?? 20
    };

    // Default to LE Coded PHY S=8 if supported, else fallback to 1M Legacy
    if (this.capabilities.supportsLeCodedPhy) {
      this.currentPhy = BlePhyType.PHY_LE_CODED;
      this.currentScheme = LeCodedScheme.S8;
    } else {
      this.currentPhy = BlePhyType.PHY_LE_1M;
      this.currentScheme = LeCodedScheme.S2;
    }
  }

  /**
   * Negotiates physical layer with remote hardware
   * If Coded PHY is unsupported, automatically falls back to 1M Legacy PHY
   */
  public negotiatePhy(preferredPhy: BlePhyType, scheme = LeCodedScheme.S8): BlePhyType {
    if (preferredPhy === BlePhyType.PHY_LE_CODED) {
      if (this.capabilities.supportsLeCodedPhy) {
        this.currentPhy = BlePhyType.PHY_LE_CODED;
        this.currentScheme = scheme;
        return BlePhyType.PHY_LE_CODED;
      } else {
        // Fallback to 1M PHY
        this.currentPhy = BlePhyType.PHY_LE_1M;
        return BlePhyType.PHY_LE_1M;
      }
    }

    this.currentPhy = preferredPhy;
    return preferredPhy;
  }

  /**
   * Returns estimated physical range in open field meters
   */
  public getEstimatedRangeMeters(): number {
    switch (this.currentPhy) {
      case BlePhyType.PHY_LE_CODED:
        return this.currentScheme === LeCodedScheme.S8 ? 400 : 250;
      case BlePhyType.PHY_LE_1M:
        return 80;
      case BlePhyType.PHY_LE_2M:
        return 40;
      default:
        return 80;
    }
  }

  public getCurrentPhy(): BlePhyType {
    return this.currentPhy;
  }

  public getCurrentScheme(): LeCodedScheme {
    return this.currentScheme;
  }
}
