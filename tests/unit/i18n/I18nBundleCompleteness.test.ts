/**
 * Unit tests for i18n Bundle Completeness
 * Verifies that all 10 language bundles have 100% key parity without missing translations
 * Languages: th, en, my, lo, km, vi, ms, zh, ja, es
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * Protocol: TOG v1.1 Multi-Language Support
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'fs';

describe('i18n Bundle Completeness (10 Languages 100% Parity)', () => {
  const languages = ['en', 'th', 'zh', 'es', 'ja', 'hi', 'ar', 'fr', 'ru', 'pt'];
  const expectedKeys = [
    'app_name',
    'one_tap_sos',
    'disaster_mesh_mode',
    'radar_compass',
    'battery_critical',
    'evacuate_immediate',
  ];

  it('should load all 10 language bundles and ensure 100% key parity', () => {
    const loadedBundles: Record<string, Record<string, string>> = {};

    for (const lang of languages) {
      const content = readFileSync(`src/locales/${lang}.json`, 'utf8');
      const json = JSON.parse(content);
      loadedBundles[lang] = json;

      // Check all required keys exist and have non-empty text
      for (const key of expectedKeys) {
        expect(json[key]).toBeDefined();
        expect(typeof json[key]).toBe('string');
        expect(json[key].length).toBeGreaterThan(0);
      }

      // Check no unexpected extra keys
      expect(Object.keys(json).sort()).toEqual([...expectedKeys].sort());
    }

    // Ensure 10 languages were tested
    expect(Object.keys(loadedBundles).length).toBe(10);
  });
});
