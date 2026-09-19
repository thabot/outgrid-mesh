/**
 * Pre-Commit Syntax & Lint Guard
 * AST Parsing Verification via TypeScript Compiler API
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import fs from 'fs';
import path from 'path';
import ts from 'typescript';

console.log('Checking project syntax...');
const rootDirs = ['src', 'scripts', 'tests'];
let count = 0;
let hasError = false;

function verifySyntax(filePath) {
  const source = fs.readFileSync(filePath, 'utf-8');
  
  if (filePath.endsWith('.json')) {
    try {
      JSON.parse(source);
      return true;
    } catch (e) {
      console.error(`[SYNTAX_ERROR] Invalid JSON in ${filePath}:`, e.message);
      return false;
    }
  }

  // TypeScript / JavaScript AST Syntax verification
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.ES2022,
    true
  );

  // Check for parse diagnostics
  const diagnostics = sourceFile.parseDiagnostics || [];
  if (diagnostics.length > 0) {
    console.error(`[SYNTAX_ERROR] Found ${diagnostics.length} syntax errors in ${filePath}:`);
    for (const diag of diagnostics) {
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(diag.start);
      const message = ts.flattenDiagnosticMessageText(diag.messageText, '\n');
      console.error(`  -> Line ${line + 1}:${character + 1} - ${message}`);
    }
    return false;
  }

  return true;
}

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const item of fs.readdirSync(dir)) {
    const p = path.join(dir, item);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      if (item !== 'node_modules' && item !== '.git' && item !== 'scratch') {
        scanDir(p);
      }
    } else if (p.endsWith('.js') || p.endsWith('.ts') || p.endsWith('.json')) {
      count++;
      const ok = verifySyntax(p);
      if (!ok) {
        hasError = true;
      }
    }
  }
}

for (const d of rootDirs) {
  scanDir(d);
}

if (hasError) {
  console.error('Syntax check failed! Please fix the errors above.');
  process.exit(1);
}

console.log('Syntax check passed! Scanned files: ' + count);
process.exit(0);
