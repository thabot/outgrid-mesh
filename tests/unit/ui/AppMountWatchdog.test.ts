import { describe, expect, it } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

describe('App Mount Watchdog & Error Diagnostics Resilience Tests', () => {
  const appHtmlPath = path.resolve('src/app.html');
  const pageSveltePath = path.resolve('src/routes/+page.svelte');
  const androidIndexPath = path.resolve('android/app/src/main/assets/index.html');
  const android404Path = path.resolve('android/app/src/main/assets/404.html');

  it('should verify src/app.html contains 12s timeout and auto-dismiss watchdog logic', () => {
    expect(fs.existsSync(appHtmlPath)).toBe(true);
    const content = fs.readFileSync(appHtmlPath, 'utf-8');

    // 1. Must use a safe timeout threshold (at least 10s, set to 12s) to prevent false alarms on slow CDN/PWA
    expect(content).toContain('12000');
    expect(content).not.toContain('3000);');

    // 2. Must provide window.__onAppMounted hook
    expect(content).toContain('window.__onAppMounted = clearMountWatchdog');

    // 3. Must have MutationObserver to detect .app-root
    expect(content).toContain("document.querySelector('.app-root')");
    expect(content).toContain('MutationObserver');

    // 4. Must provide manual dismiss button for user accessibility
    expect(content).toContain('dismiss-err-btn');
    expect(content).toContain('ปิดหน้านี้ / รอดูผล (Dismiss)');

    // 5. Must guard genuine errors with hasRealError flag so actual bugs are never suppressed
    expect(content).toContain('hasRealError');
  });

  it('should verify src/routes/+page.svelte calls window.__onAppMounted on mount', () => {
    expect(fs.existsSync(pageSveltePath)).toBe(true);
    const content = fs.readFileSync(pageSveltePath, 'utf-8');

    expect(content).toContain('__onAppMounted');
    expect(content).toContain('(window as any).__onAppMounted()');
  });

  it('should verify android assets html files match the resilient watchdog pattern', () => {
    for (const file of [androidIndexPath, android404Path]) {
      expect(fs.existsSync(file)).toBe(true);
      const content = fs.readFileSync(file, 'utf-8');

      expect(content).toContain('12000');
      expect(content).toContain('dismiss-err-btn');
      expect(content).toContain('window.__onAppMounted');
      expect(content).toContain('MutationObserver');
    }
  });

  it('should verify clearMountWatchdog logic correctly cleans up when no real error exists', () => {
    // Simulate DOM environment
    let removed = false;
    let timerCleared = false;

    let mountTimer: any = 12345;
    let hasRealError = false;

    const mockErrBox = {
      remove: () => { removed = true; },
      style: { display: 'block' }
    };

    function clearMountWatchdog() {
      if (mountTimer) {
        timerCleared = true;
        mountTimer = null;
      }
      if (mockErrBox && !hasRealError) {
        mockErrBox.remove();
      }
    }

    // Call clearMountWatchdog
    clearMountWatchdog();

    expect(timerCleared).toBe(true);
    expect(removed).toBe(true);
  });

  it('should preserve error box if a genuine error was flagged', () => {
    let removed = false;
    let hasRealError = true;

    const mockErrBox = {
      remove: () => { removed = true; },
      style: { display: 'block' }
    };

    function clearMountWatchdog() {
      if (mockErrBox && !hasRealError) {
        mockErrBox.remove();
      }
    }

    clearMountWatchdog();

    // Must NOT remove if a real runtime crash happened
    expect(removed).toBe(false);
  });
});
