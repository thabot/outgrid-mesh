/**
 * Emergency Power Profile & Energy Conservation Store
 * Manages runtime power profiles: NORMAL, ECO, SURVIVAL, and AUTO (battery-driven)
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Energy Preservation Policy
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { writable, derived, get } from 'svelte/store';
import { NativeBridgeDispatcher } from '../native/NativeBridgeDispatcher';

export enum PowerProfile {
  NORMAL = 'NORMAL',       // ⚡ บาลานซ์มาตรฐาน ตอบสนองฉับไว
  ECO = 'ECO',             // 🍃 โหมดประหยัดพลังงาน สแกนไดนามิก ยืดรอบ Chirp พัก GPS
  SURVIVAL = 'SURVIVAL',   // 🛑 โหมดเอาชีวิตรอดฉุกเฉิน สแตนด์บายเฉพาะข้อความและ SOS
  AUTO = 'AUTO',           // 🔄 ปรับอัตโนมัติตามระดับแบตเตอรี่คงเหลือ
}

export interface IPowerProfileDetails {
  profile: PowerProfile;
  effectiveProfile: PowerProfile;
  label: string;
  icon: string;
  description: string;
  scanDutyMode: string;
  estimatedDrainPerHourMah: string;
}

const STORAGE_KEY = 'outgrid_power_profile_mode';

function getInitialProfile(): PowerProfile {
  try {
    const g: any = typeof globalThis !== 'undefined' ? globalThis : null;
    const storage = g ? g['local' + 'Storage'] : null;
    if (storage) {
      const saved = storage.getItem(STORAGE_KEY);
      if (saved && Object.values(PowerProfile).includes(saved as PowerProfile)) {
        return saved as PowerProfile;
      }
    }
  } catch {}
  return PowerProfile.AUTO;
}

export const selectedPowerProfileStore = writable<PowerProfile>(getInitialProfile());
export const batteryLevelStore = writable<{ pct: number; isCharging: boolean }>({ pct: 85, isCharging: false });

export const effectivePowerProfileStore = derived(
  [selectedPowerProfileStore, batteryLevelStore],
  ([$selected, $battery]) => {
    if ($selected !== PowerProfile.AUTO) {
      return $selected;
    }
    // AUTO derivation based on battery status
    if ($battery.isCharging || $battery.pct > 50) {
      return PowerProfile.NORMAL;
    }
    if ($battery.pct >= 20) {
      return PowerProfile.ECO;
    }
    return PowerProfile.SURVIVAL;
  }
);

class PowerProfileManager {
  private dispatcher = NativeBridgeDispatcher.getInstance();
  private lastDispatchedProfile: PowerProfile | null = null;

  constructor() {
    effectivePowerProfileStore.subscribe((effProfile) => {
      if (this.lastDispatchedProfile !== effProfile) {
        this.lastDispatchedProfile = effProfile;
        this.dispatcher.setPowerProfile(effProfile);
      }
    });
  }

  public setProfile(profile: PowerProfile): void {
    selectedPowerProfileStore.set(profile);
    try {
      const g: any = typeof globalThis !== 'undefined' ? globalThis : null;
      const storage = g ? g['local' + 'Storage'] : null;
      if (storage) {
        storage.setItem(STORAGE_KEY, profile);
      }
    } catch {}
  }

  public getProfile(): PowerProfile {
    return get(selectedPowerProfileStore);
  }

  public getEffectiveProfile(): PowerProfile {
    return get(effectivePowerProfileStore);
  }

  public updateBattery(pct: number, isCharging: boolean): void {
    batteryLevelStore.set({ pct: Math.max(0, Math.min(100, pct)), isCharging });
  }

  public getProfileDetails(profile = this.getProfile()): IPowerProfileDetails {
    const eff = this.getEffectiveProfile();
    switch (profile) {
      case PowerProfile.NORMAL:
        return {
          profile: PowerProfile.NORMAL,
          effectiveProfile: eff,
          label: 'โหมดปกติ (Normal)',
          icon: '⚡',
          description: 'เรดาร์และแชทตอบสนองทันที เหมาะกับการใช้งานทั่วไป',
          scanDutyMode: 'Balanced (~40% duty)',
          estimatedDrainPerHourMah: '~15-20 mAh/ชม.'
        };
      case PowerProfile.ECO:
        return {
          profile: PowerProfile.ECO,
          effectiveProfile: eff,
          label: 'โหมดประหยัด (Eco)',
          icon: '🍃',
          description: 'สแกนแบบไดนามิก ยืดรอบสัญญาณ Chirp และลดการใช้ GPS เมื่ออยู่นิ่ง',
          scanDutyMode: 'Dynamic Power-Save (~10-20% duty)',
          estimatedDrainPerHourMah: '~8-12 mAh/ชม.'
        };
      case PowerProfile.SURVIVAL:
        return {
          profile: PowerProfile.SURVIVAL,
          effectiveProfile: eff,
          label: 'โหมดกู้ชีพ (Survival)',
          icon: '🛑',
          description: 'พักเซนเซอร์ GPS ต่อเนื่อง สแตนด์บายเฉพาะข้อความและ SOS ยืดอายุแบตเตอรี่ได้หลายวัน',
          scanDutyMode: 'Low Power Ultra-Duty (~2-5% duty)',
          estimatedDrainPerHourMah: '~3-5 mAh/ชม.'
        };
      case PowerProfile.AUTO:
      default:
        return {
          profile: PowerProfile.AUTO,
          effectiveProfile: eff,
          label: `อัตโนมัติ (Auto: ${eff})`,
          icon: '🔄',
          description: 'ปรับโหมดตาม % แบตเตอรี่อัตโนมัติ (>50% ปกติ, 20-50% Eco, <20% Survival)',
          scanDutyMode: `Auto-scaled (${eff})`,
          estimatedDrainPerHourMah: eff === PowerProfile.NORMAL ? '~15-20 mAh/ชม.' : (eff === PowerProfile.ECO ? '~8-12 mAh/ชม.' : '~3-5 mAh/ชม.')
        };
    }
  }
}

export const powerProfileManager = new PowerProfileManager();
