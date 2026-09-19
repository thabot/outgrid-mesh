import { describe, it, expect } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Task 1.5.1: Architecture Boundary Isolation Test
 * Pure Domain Core Isolation: Zero Platform Leaks (No Browser, No Capacitor, No Android APIs in src/core)
 */
describe('ArchitectureBoundary (Phase 1 Task 1.5.1)', () => {
  const coreDir = path.resolve(__dirname, '../../../src/core');

  const FORBIDDEN_TOKENS = [
    '@capacitor/',
    'window.',
    'document.',
    'localStorage.',
    'sessionStorage.',
    'android.os',
    'android.content',
    'android.bluetooth',
    'navigator.geolocation'
  ];

  function getAllTsFiles(dir: string): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...getAllTsFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        results.push(fullPath);
      }
    }
    return results;
  }

  it('should guarantee that src/core has ZERO platform/browser/native leaks', () => {
    const files = getAllTsFiles(coreDir);
    expect(files.length).toBeGreaterThan(15);

    const violations: { file: string; token: string; line: number }[] = [];

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        // Skip comment lines
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
          return;
        }

        for (const token of FORBIDDEN_TOKENS) {
          if (line.includes(token)) {
            violations.push({
              file: path.relative(coreDir, filePath),
              token,
              line: index + 1
            });
          }
        }
      });
    }

    if (violations.length > 0) {
      console.error('Boundary Violations:', violations);
    }

    expect(violations).toHaveLength(0);
  });
});
