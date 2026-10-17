import { describe, it, expect } from 'bun:test';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

describe('README Download Channels & Releases Verification', () => {
  it('should verify README.md contains production and uat release page links and direct download links', () => {
    const readmePath = resolve(process.cwd(), 'README.md');
    expect(existsSync(readmePath)).toBe(true);

    const content = readFileSync(readmePath, 'utf8');

    // Production release page and direct download
    expect(content).toContain('https://github.com/thabot/outgrid-mesh/releases/latest');
    expect(content).toContain('https://github.com/thabot/outgrid-mesh/releases/latest/download/outgrid-mesh.apk');

    // UAT release page and direct download
    expect(content).toContain('https://github.com/thabot/outgrid-mesh/releases/tag/v1.1.0-uat');
    expect(content).toContain('https://github.com/thabot/outgrid-mesh/releases/download/v1.1.0-uat/outgrid-mesh-uat.apk');

    // All releases link
    expect(content).toContain('https://github.com/thabot/outgrid-mesh/releases');
  });
});
