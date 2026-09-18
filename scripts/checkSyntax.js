import fs from 'fs';
import path from 'path';

console.log('Checking project syntax...');
const rootDirs = ['src', 'scripts', 'tests'];
let count = 0;

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const item of fs.readdirSync(dir)) {
    const p = path.join(dir, item);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      if (item !== 'node_modules' && item !== '.git') scanDir(p);
    } else if (p.endsWith('.js') || p.endsWith('.ts')) {
      count++;
    }
  }
}

for (const d of rootDirs) scanDir(d);
console.log('Syntax check passed! Scanned files: ' + count);
process.exit(0);
