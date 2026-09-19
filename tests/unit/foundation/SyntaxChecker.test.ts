import { describe, it, expect } from 'bun:test';
import * as path from 'path';
import * as fs from 'fs';
import { spawnSync } from 'child_process';

describe('SyntaxChecker (Phase 1 Task 1.5.4)', () => {
  const scriptPath = path.resolve(__dirname, '../../../scripts/checkSyntax.js');
  const tempDir = path.resolve(__dirname, '../../../tests/fixtures/syntax');

  it('should exit with code 0 when scanning clean valid files', () => {
    const result = spawnSync('node', [scriptPath], { encoding: 'utf-8' });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Syntax check passed!');
  });

  it('should detect simulated syntax errors in test fixtures and fail appropriately', () => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const badFilePath = path.join(tempDir, 'broken_syntax.ts');
    // Intentionally broken TypeScript with unclosed braces and malformed syntax
    fs.writeFileSync(badFilePath, 'export const a: = { unclosed: ;');

    try {
      // Run node scripts/checkSyntax.js which will scan tests/ and catch broken_syntax.ts
      const checkResult = spawnSync('node', [scriptPath], { encoding: 'utf-8' });
      expect(checkResult.status).toBe(1);
      expect(checkResult.stderr + checkResult.stdout).toContain('[SYNTAX_ERROR]');
    } finally {
      // Always clean up the broken file
      if (fs.existsSync(badFilePath)) {
        fs.unlinkSync(badFilePath);
      }
      if (fs.existsSync(tempDir)) {
        fs.rmdirSync(tempDir);
      }
    }
  });
});
