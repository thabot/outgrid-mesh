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

  it('should verify Map and OneTapSos components integrate reactive translations with 10-language parity', () => {
    let dict: Record<string, string> = {};
    const unsub = i18n.translations.subscribe((t) => {
      dict = t;
    });

    // Test Japanese (ja) - User issue reproduction and fix assertion
    i18n.setLocale('ja');
    expect(dict.map_radar_title).toBe('🗺️ レーダー＆救助マップ');
    expect(dict.legend_online).toBe('🟢 インターネット接続');
    expect(dict.legend_offline_bt).toBe('🔘 オフライン (Bluetooth Mesh)');
    expect(dict.self_marker_label).toBe('自分');
    expect(dict.compass_heading_up).toBe('📱 進行方向 (Heading-Up)');
    expect(dict.compass_north_up).toBe('⬆️ 北固定 (North-Up)');
    expect(dict.sos_category_flood).toBe('🌊 浸水・冠水孤立');
    expect(dict.sos_category_rubble).toBe('🏚️ 倒壊家屋・瓦礫の下');
    expect(dict.modal_battery_title).toBe('⚡ バッテリー最適化の解除 (制限なし)');

    // Test Thai (th)
    i18n.setLocale('th');
    expect(dict.map_radar_title).toBe('🗺️ เรดาร์ & แผนที่กู้ภัย');
    expect(dict.legend_online).toBe('🟢 ต่อ Internet ได้');
    expect(dict.self_marker_label).toBe('ฉัน');
    expect(dict.sos_category_flood).toBe('🌊 น้ำท่วมติดค้าง');

    // Test Chinese (zh)
    i18n.setLocale('zh');
    expect(dict.map_radar_title).toBe('🗺️ 雷达与救援地图');
    expect(dict.self_marker_label).toBe('我');
    expect(dict.sos_category_flood).toBe('🌊 洪水被困');

    // Test English (en)
    i18n.setLocale('en');
    expect(dict.map_radar_title).toBe('🗺️ Radar & Rescue Map');
    expect(dict.self_marker_label).toBe('Me');
    expect(dict.sos_category_flood).toBe('🌊 Flood / Trapped');

    unsub();

    // Verify SosMapView.svelte has i18n bindings
    const mapPath = join(root, 'src/ui/components/SosMapView.svelte');
    expect(existsSync(mapPath)).toBe(true);
    const mapContent = readFileSync(mapPath, 'utf8');
    expect(mapContent).toContain('$translations.map_radar_title');
    expect(mapContent).toContain('$translations.legend_online');
    expect(mapContent).toContain('$translations.compass_toggle_title');
    expect(mapContent).toContain('$translations.self_marker_label');
    expect(mapContent).toContain('$translations.inspector_distance');

    // Verify OneTapSos.svelte has i18n bindings
    const sosPath = join(root, 'src/ui/components/OneTapSos.svelte');
    expect(existsSync(sosPath)).toBe(true);
    const sosContent = readFileSync(sosPath, 'utf8');
    expect(sosContent).toContain('$translations.sos_screen_title');
    expect(sosContent).toContain('$translations.sos_category_flood');
    expect(sosContent).toContain('$translations.sos_btn_send');
  });
});
