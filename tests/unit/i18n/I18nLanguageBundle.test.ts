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
});
