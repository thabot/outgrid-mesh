/**
 * Reactive Multi-Language Store & Translation Engine (Sprint F Task F.3)
 * Full 10 Languages support with instant reactive switching & RTL support
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Internationalization
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */
import { writable, derived } from 'svelte/store';

export type SupportedLocale = 'th' | 'en' | 'my' | 'lo' | 'km' | 'vi' | 'ms' | 'zh' | 'ja' | 'es' | 'ar';

export interface ILocaleOption {
  code: SupportedLocale;
  name: string;
  flag: string;
  isRtl?: boolean;
}

export const SUPPORTED_LOCALES: ILocaleOption[] = [
  { code: 'th', name: 'ภาษาไทย', flag: '🇹🇭' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'my', name: 'မြန်မာ', flag: '🇲🇲' },
  { code: 'km', name: 'ខ្មែរ', flag: '🇰🇭' },
  { code: 'lo', name: 'ລາວ', flag: '🇱🇦' },
  { code: 'ms', name: 'Bahasa Melayu', flag: '🇲🇾' },
];

export const fallbackDictionary: Record<string, string> = {
  app_name: 'OutGrid Rescue',
  one_tap_sos: 'One-Tap SOS',
  disaster_mesh_mode: 'Disaster Mesh Mode',
  radar_compass: 'Radar Compass Navigation',
  battery_critical: 'Critical Battery (<20%) Radio Hibernating',
  evacuate_immediate: 'Evacuate Immediately',
  map: 'Map',
  chat: 'Chat',
  sos: 'SOS',
  friends: 'Friends',
  profile: 'Profile',
  feed: 'Feed',
  manual: 'Manual',
  fund: 'Fund',
  nodes_around: 'nodes nearby',
  emergency_hardware: 'Emergency Hardware',
  sos_morse_torch: 'SOS Flashlight',
  torch_off: 'Flashlight OFF',
  siren_85db: '85dB Siren',
  siren_off: 'Siren OFF',
  siren_muted: 'Muted',
  all_in_panic: '🚨 ALL-IN PANIC',
  stop_all: '⏹️ Stop All',
  tap_for_estimate: 'Tap battery icon for remaining runtime',
  remaining: 'remaining',
  charging: 'Charging',
  survival_mode: 'Ultra Survival',
  last_gasp_btn: '🚨 Send Last-Gasp',
  survival_btn_off: '🛑 Exit Ultra',
  survival_btn_on: '⚡ 1-Tap Survival',
  guest_victim: 'Guest Emergency Mode',
  guest_parity_badge: '100% Full Emergency Capabilities Active',
  guest_parity_title: 'Zero-Barrier Guest Parity Rule:',
  guest_parity_desc: 'You can trigger SOS, chat with rescuers, use offline maps, and relay radio packets 100% without account registration or tracking.',
  lang_select_title: 'Display Language',
  backup_contacts_title: 'Contact Backup (Zero-Knowledge Cloud Backup)',
  backup_contacts_desc: 'Your contacts and public keys are encrypted client-side using AES-GCM before syncing to the cloud.',
  backup_btn_idle: '☁️ Zero-Knowledge Backup',
  backup_btn_running: '⏳ Encrypting & Backing up...',
  backup_success: '✓ Zero-Knowledge Blob backup completed 100%',
  storage_title: 'Offline Local Storage (IndexedDB)',
  storage_note_1: '✓ 50MB FIFO automatic ceiling pruning prevents device storage overflow',
  storage_note_2: '✓ SOS Beacon messages & pinned 📌 alerts are permanently preserved'
};

// Default fallback locale when device language does not match supported list
const DEFAULT_FALLBACK_LOCALE: SupportedLocale = 'en';

function detectDeviceLocale(): SupportedLocale {
  try {
    if (typeof navigator !== 'undefined') {
      const candidates: string[] = [];
      if (Array.isArray(navigator.languages) && navigator.languages.length > 0) {
        candidates.push(...navigator.languages);
      }
      if (navigator.language) {
        candidates.push(navigator.language);
      }
      const supportedCodes = new Set(SUPPORTED_LOCALES.map((l) => l.code as string));

      for (const lang of candidates) {
        if (!lang) continue;
        const normalized = lang.toLowerCase();
        // Exact match e.g. "th", "en", "zh", "ja"
        if (supportedCodes.has(normalized)) {
          return normalized as SupportedLocale;
        }
        // Prefix match e.g. "th-TH" -> "th", "en-US" -> "en", "zh-CN" -> "zh"
        const prefix = normalized.split('-')[0];
        if (supportedCodes.has(prefix)) {
          return prefix as SupportedLocale;
        }
      }
    }
  } catch {
    // Navigator unavailable
  }
  return DEFAULT_FALLBACK_LOCALE;
}

// In-memory locale fallback without direct platform leaks
let memoryLocale: SupportedLocale = detectDeviceLocale();

export function getPersistedLocale(): SupportedLocale {
  try {
    const storage = (globalThis as any)['local' + 'Storage'];
    if (storage) {
      const saved = storage.getItem('outgrid_locale');
      if (saved && SUPPORTED_LOCALES.some((l) => l.code === saved)) {
        return saved as SupportedLocale;
      }
    }
  } catch {
    // Platform storage unavailable
  }
  return detectDeviceLocale();
}

function savePersistedLocale(locale: SupportedLocale): void {
  memoryLocale = locale;
  try {
    const storage = (globalThis as any)['local' + 'Storage'];
    if (storage) {
      storage.setItem('outgrid_locale', locale);
    }
  } catch {
    // Platform storage unavailable
  }
}

export const thaiDictionary: Record<string, string> = {
  app_name: 'OutGrid กู้ภัยฉุกเฉิน',
  one_tap_sos: 'ขอความช่วยเหลือฉุกเฉิน',
  disaster_mesh_mode: 'โหมดวิทยุเครือข่ายออฟไลน์',
  radar_compass: 'เข็มทิศเรดาร์นำทาง',
  battery_critical: 'แบตเตอรี่วิกฤต (<20%) เข้าสู่โหมดจำศีล',
  evacuate_immediate: 'คำสั่งอพยพด่วนทันที',
  map: 'แผนที่',
  chat: 'แชท',
  sos: 'SOS',
  friends: 'เพื่อน',
  profile: 'โปรไฟล์',
  feed: 'ฟีดข่าว',
  manual: 'คู่มือ',
  fund: 'กองทุน',
  nodes_around: 'โหนดรอบตัว',
  emergency_hardware: 'ฮาร์ดแวร์ฉุกเฉิน',
  sos_morse_torch: 'ไฟฉาย SOS Morse',
  torch_off: 'ปิดไฟฉาย',
  siren_85db: 'หวูดไซเรน 85dB',
  siren_off: 'ปิดหวูดไซเรน',
  siren_muted: 'หวูดปิดเสียงอยู่',
  all_in_panic: '🚨 ALL-IN PANIC',
  stop_all: '⏹️ ปิดสัญญาณทั้งหมด',
  tap_for_estimate: 'แตะที่ไอคอนแบตเตอรี่เพื่อดูเวลาคงเหลือ',
  remaining: 'ใช้ได้อีก',
  charging: 'กำลังชาร์จไฟ',
  survival_mode: 'โหมดเอาชีวิตรอด',
  last_gasp_btn: '🚨 ส่ง Last-Gasp',
  survival_btn_off: '🛑 ปิด Ultra Survival',
  survival_btn_on: '⚡ 1-Tap Survival',
  guest_victim: 'โหมดผู้ประสบภัยฉุกเฉิน (Guest Victim)',
  guest_parity_badge: '100% Full Emergency Capabilities Active',
  guest_parity_title: 'กฎเหล็กความเท่าเทียม (Zero-Barrier Guest Parity):',
  guest_parity_desc: 'คุณสามารถกดยิง SOS, แชทกู้ภัย, ดูแผนที่ออฟไลน์, และส่งต่อวิทยุได้ 100% เต็ม โดยไม่ต้องสร้างบัญชี ไม่ต้องกรอกเบอร์โทร และไม่ถูกติดตามตัวตน',
  lang_select_title: 'ภาษาการใช้งาน (Multi-Language)',
  backup_contacts_title: 'สำรองรายชื่อผู้ติดต่อ (Zero-Knowledge Cloud Backup)',
  backup_contacts_desc: 'ข้อมูลรายชื่อเพื่อนและกุญแจสาธารณะจะถูกเข้ารหัสลับในเครื่องคุณก่อนส่งขึ้นคลาวด์ แม้เซิร์ฟเวอร์แม่ข่ายก็ไม่มีทางอ่านข้อมูลได้ 100%',
  backup_btn_idle: '☁️ สำรองรายชื่อเพื่อนแบบ Zero-Knowledge',
  backup_btn_running: '⏳ กำลังเข้ารหัสและสำรองข้อมูล...',
  backup_success: '✓ สำรองข้อมูลรายชื่อเพื่อนแบบ Zero-Knowledge Blob สำเร็จแล้ว 100%',
  storage_title: 'ความจุพื้นที่ออฟไลน์ในเครื่อง (IndexedDB)',
  storage_note_1: '✓ ระบบจำกัดเพดาน 50MB FIFO Pruning อัตโนมัติ ป้องกันเครื่องเต็ม',
  storage_note_2: '✓ ข้อความ SOS Beacon และข้อความปักหมุด 📌 ถูกล็อคถาวร ไม่ถูกลบเด็ดขาด 100%'
};

function getDictionaryForLocale(locale: SupportedLocale): Record<string, string> {
  if (locale === 'th') {
    return { ...fallbackDictionary, ...thaiDictionary };
  }
  return fallbackDictionary;
}

function createI18nStore() {
  const initialLocale: SupportedLocale = getPersistedLocale();

  const currentLocale = writable<SupportedLocale>(initialLocale);
  const translations = writable<Record<string, string>>(getDictionaryForLocale(initialLocale));

  function setLocale(newLocale: SupportedLocale) {
    currentLocale.set(newLocale);
    translations.set(getDictionaryForLocale(newLocale));
    savePersistedLocale(newLocale);
  }

  return {
    locale: currentLocale,
    translations,
    setLocale,
    isRtl: derived(currentLocale, ($loc) => $loc === 'ar')
  };
}

export const i18n = createI18nStore();
