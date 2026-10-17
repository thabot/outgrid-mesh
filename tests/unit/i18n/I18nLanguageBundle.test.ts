import { describe, it, expect } from 'bun:test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { i18n, SUPPORTED_LOCALES, type SupportedLocale } from '../../../src/core/i18n/I18nStore';

describe('I18nLanguageBundle (Sprint F Task F.5 10-Language Parity & Store)', () => {
  const root = process.cwd();

  it('should have all 10 language JSON files present in src/locales/ with 100% key parity', () => {
    const baseContent = readFileSync(join(root, 'src/locales/en.json'), 'utf8');
    const baseKeys = Object.keys(JSON.parse(baseContent)).sort();

    expect(baseKeys.length).toBeGreaterThan(0);

    for (const locale of SUPPORTED_LOCALES) {
      const filePath = join(root, `src/locales/${locale.code}.json`);
      expect(existsSync(filePath)).toBe(true);

      const content = readFileSync(filePath, 'utf8');
      const json = JSON.parse(content);
      const keys = Object.keys(json).sort();

      expect(keys).toEqual(baseKeys);
    }
  });

  it('should reactively switch locale in i18n store', () => {
    let active = 'th';
    const unsubscribe = i18n.locale.subscribe((val) => {
      active = val;
    });

    i18n.setLocale('ja');
    expect(active).toBe('ja');

    i18n.setLocale('en');
    expect(active).toBe('en');

    unsubscribe();
  });

  it('should correctly flag Arabic as RTL', () => {
    let isRtlValue = false;
    const unsub = i18n.isRtl.subscribe((val) => {
      isRtlValue = val;
    });

    i18n.setLocale('ar');
    expect(isRtlValue).toBe(true);

    i18n.setLocale('th');
    expect(isRtlValue).toBe(false);

    unsub();
  });

  it('should persist selected locale to storage and reload via i18n.init()', () => {
    i18n.setLocale('en');
    const storage = (globalThis as any)['local' + 'Storage'];
    if (storage) {
      expect(storage.getItem('outgrid_locale')).toBe('en');
    }

    let dict: Record<string, string> = {};
    const unsub = i18n.translations.subscribe((t) => {
      dict = t;
    });

    expect(dict.menu_survival_manual).toBe('Field Survival Manual (10 Languages)');
    expect(dict.menu_share_apk).toBe('Share APK Offline (Sideload)');
    expect(dict.profile_screen_title).toBe('Device Details & Identity Profile');
    expect(dict.btn_close).toBe('Close');

    // Switch to Thai
    i18n.setLocale('th');
    if (storage) {
      expect(storage.getItem('outgrid_locale')).toBe('th');
    }
    expect(dict.menu_survival_manual).toBe('คู่มือเอาชีวิตรอด (10 ภาษา)');
    expect(dict.menu_share_apk).toBe('แชร์ APK ออฟไลน์ (Sideload)');
    expect(dict.profile_screen_title).toBe('ข้อมูลเครื่องและโปรไฟล์ตัวตน');
    expect(dict.btn_close).toBe('ปิด');

    // Switch to Chinese (zh)
    i18n.setLocale('zh');
    if (storage) {
      expect(storage.getItem('outgrid_locale')).toBe('zh');
    }
    expect(dict.menu_survival_manual).toBe('应急生存手册 (10种语言)');
    expect(dict.menu_share_apk).toBe('离线分享 APK (免流传包)');
    expect(dict.profile_screen_title).toBe('设备详情与身份资料');
    expect(dict.btn_close).toBe('关闭');

    // Switch to Japanese (ja)
    i18n.setLocale('ja');
    expect(dict.menu_survival_manual).toBe('緊急サバイバルマニュアル (10言語)');
    expect(dict.menu_share_apk).toBe('オフライン APK 共有 (サイドロード)');

    // Test init() restores persisted locale
    if (storage) {
      storage.setItem('outgrid_locale', 'en');
      i18n.init();
      expect(dict.menu_survival_manual).toBe('Field Survival Manual (10 Languages)');
    }

    unsub();
  });

  it('should verify HamburgerDrawer and AuthProfileScreen have reactive translations and close capability', () => {
    const drawerPath = join(root, 'src/ui/components/HamburgerDrawer.svelte');
    expect(existsSync(drawerPath)).toBe(true);
    const drawerContent = readFileSync(drawerPath, 'utf8');
    expect(drawerContent).toContain('$translations.menu_survival_manual');
    expect(drawerContent).toContain('$translations.menu_share_apk');
    expect(drawerContent).toContain('$translations.menu_beacon');
    expect(drawerContent).toContain('$translations.menu_fund');
    expect(drawerContent).toContain('$translations.menu_feed');
    expect(drawerContent).toContain('$translations.menu_friends');
    expect(drawerContent).toContain('$translations.menu_profile');
    expect(drawerContent).toContain('$translations.menu_system');
    expect(drawerContent).toContain('$translations.node_id_label');

    const profilePath = join(root, 'src/ui/components/AuthProfileScreen.svelte');
    expect(existsSync(profilePath)).toBe(true);
    const profileContent = readFileSync(profilePath, 'utf8');
    expect(profileContent).toContain('btn-close-profile');
    expect(profileContent).toContain('btn-back-main');
    expect(profileContent).toContain("dispatch('close')");
    expect(profileContent).toContain('$t.profile_screen_title');
    expect(profileContent).toContain('$t.btn_edit_name');
    expect(profileContent).toContain('$t.btn_save');
  });
});
