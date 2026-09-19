import { describe, it, expect } from 'bun:test';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

describe('HelpManualScreen & 10-Language Manuals - Task 10.5 Unit Tests', () => {
  const locales = ['th', 'en', 'zh', 'es', 'hi', 'ar', 'fr', 'ru', 'pt', 'ja'];

  it('should have all 10 emergency manuals in docs/manuals/', () => {
    for (const loc of locales) {
      const manualFile = resolve(process.cwd(), `docs/manuals/manual.${loc}.md`);
      expect(existsSync(manualFile)).toBe(true);

      const content = readFileSync(manualFile, 'utf8');
      expect(content.length).toBeGreaterThan(200);
      expect(content).toContain('TOG v1.1');
      expect(content).toContain('Thabot');
    }
  });

  it('should have HelpManualScreen.svelte component implemented', () => {
    const sveltePath = resolve(process.cwd(), 'src/ui/components/HelpManualScreen.svelte');
    expect(existsSync(sveltePath)).toBe(true);

    const svelteContent = readFileSync(sveltePath, 'utf8');
    // Verify 10 languages supported in dictionary
    for (const loc of locales) {
      expect(svelteContent).toContain(`${loc}: {`);
    }

    // Verify RTL handling for Arabic
    expect(svelteContent).toContain("class:rtl={isRtl}");
    expect(svelteContent).toContain("dir={isRtl ? 'rtl' : 'ltr'}");
  });

  it('should verify Arabic locale triggers RTL layout flag', () => {
    const svelteContent = readFileSync(resolve(process.cwd(), 'src/ui/components/HelpManualScreen.svelte'), 'utf8');
    expect(svelteContent).toContain('ar:');
    expect(svelteContent).toContain('isRtl: true');
  });
});
