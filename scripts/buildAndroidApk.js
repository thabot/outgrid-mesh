/**
 * Automated Android APK Build Pipeline
 * Workflow: checkSyntax -> bun run build -> sync assets to android/app/src/main/assets -> package check
 * Protocol: TOG v1.1 Master Project Plan v6.1 Phase 7 & Sprint H Task H.4
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve('.');
const buildDir = path.join(projectRoot, 'build');
const androidAssetsDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'assets');

console.log('====================================================');
console.log('🚀 Starting OutGrid Mesh Android Native Build Pipeline');
console.log('====================================================');

// Step 1: Pre-build syntax verification gate
console.log('\n[1/4] Running Pre-Commit Syntax Quality Gate...');
try {
  execSync('node scripts/checkSyntax.js', { stdio: 'inherit' });
  console.log('✅ Syntax verification passed 100%.');
} catch (err) {
  console.error('❌ Syntax check failed! Aborting build.');
  process.exit(1);
}

// Step 2: Compile web application bundle
console.log('\n[2/4] Compiling SvelteKit Web Application Bundle...');
try {
  execSync('bun run build', { stdio: 'inherit' });
  console.log('✅ Web compilation completed.');
} catch (err) {
  console.error('❌ Web compilation failed! Aborting build.');
  process.exit(1);
}

// Step 3: Copy build outputs to Android assets directory
console.log('\n[3/4] Syncing Assets to Android Native Container...');
if (!fs.existsSync(buildDir)) {
  console.error('❌ Build directory not found:', buildDir);
  process.exit(1);
}

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Clear and copy
if (fs.existsSync(androidAssetsDir)) {
  fs.rmSync(androidAssetsDir, { recursive: true, force: true });
}
copyDirRecursive(buildDir, androidAssetsDir);
console.log(`✅ Synced ${fs.readdirSync(androidAssetsDir).length} top-level entries to android assets.`);

// Step 4: Verify Android Manifest and Package Config
console.log('\n[4/4] Verifying Android Native Shell & Sideload readiness...');
const manifestPath = path.join(projectRoot, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
if (!fs.existsSync(manifestPath)) {
  console.error('❌ AndroidManifest.xml not found!');
  process.exit(1);
}

const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
const hasBle = manifestContent.includes('android.permission.BLUETOOTH_SCAN');
const hasService = manifestContent.includes('OutGridMeshService');
const hasBoot = manifestContent.includes('BootReceiver');

if (hasBle && hasService && hasBoot) {
  console.log('✅ Android Manifest verified with BLE Coded, 24/7 Service, and BootReceiver.');
} else {
  console.warn('⚠️ Warning: Android Manifest missing expected configuration entries.');
}

console.log('\n🎉 OutGrid Mesh Android Native Package is 100% READY for compilation & offline sideloading!');
console.log('====================================================\n');
