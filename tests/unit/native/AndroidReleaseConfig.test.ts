/**
 * Android Release & Google Play CI/CD Configuration Unit Tests
 * Protocol: TOG v1.1 Master Project Plan v6.1 - Automated Distribution
 * Creator & Lead Architect: Thabot <thabo47@gmail.com>
 * License: AGPL-3.0 + Commercial Rights Reserved to Thabot
 */

import { describe, expect, it } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';

describe('Android Release & Google Play Deployment Automation', () => {
  const rootDir = path.resolve(__dirname, '../../..');
  const buildGradlePath = path.join(rootDir, 'android/app/build.gradle');
  const workflowPath = path.join(rootDir, '.github/workflows/android-release.yml');

  it('should verify android/app/build.gradle contains release signing configuration', () => {
    expect(fs.existsSync(buildGradlePath)).toBe(true);
    const buildGradle = fs.readFileSync(buildGradlePath, 'utf8');

    // Verify release signing block exists
    expect(buildGradle).toContain('release {');
    expect(buildGradle).toContain('ANDROID_KEYSTORE_FILE');
    expect(buildGradle).toContain('KEYSTORE_PASSWORD');
    expect(buildGradle).toContain('KEY_ALIAS');
    expect(buildGradle).toContain('KEY_PASSWORD');
    expect(buildGradle).toContain('signingConfig signingConfigs.release');
  });

  it('should verify .github/workflows/android-release.yml has AAB building and artifacts configured', () => {
    expect(fs.existsSync(workflowPath)).toBe(true);
    const workflow = fs.readFileSync(workflowPath, 'utf8');

    // Verify AAB metadata is set
    expect(workflow).toContain('aab_name=outgrid-mesh.aab');
    expect(workflow).toContain('aab_name=outgrid-mesh-uat.aab');
    expect(workflow).toContain('play_track=production');
    expect(workflow).toContain('play_track=internal');

    // Verify keystore decoding
    expect(workflow).toContain('Decode Android Release Keystore');
    expect(workflow).toContain('secrets.ANDROID_KEYSTORE_BASE64');

    // Verify bundleRelease is executed
    expect(workflow).toContain('gradle bundleRelease');
    expect(workflow).toContain('app/build/outputs/bundle/release/app-release.aab');

    // Verify AAB artifact upload
    expect(workflow).toContain('Upload AAB as Workflow Artifact');

    // Verify Google Play deploy step with secret guard
    expect(workflow).toContain('Deploy to Google Play Console');
    expect(workflow).toContain('secrets.PLAY_STORE_JSON_KEY');
    expect(workflow).toContain('uses: r0adkll/upload-google-play@v1');
    expect(workflow).toContain('packageName: io.outgrid.mesh');
  });

  it('should verify .gitignore protects *.jks and *.keystore files from leakage', () => {
    const gitignorePath = path.join(rootDir, '.gitignore');
    expect(fs.existsSync(gitignorePath)).toBe(true);
    const gitignore = fs.readFileSync(gitignorePath, 'utf8');

    expect(gitignore).toContain('*.jks');
    expect(gitignore).toContain('*.keystore');
  });
});
