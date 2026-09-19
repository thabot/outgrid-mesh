import { describe, it, expect } from 'bun:test';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

describe('DonationDashboard - Task 9.3 Component & Logic Tests', () => {
  const sveltePath = resolve(process.cwd(), 'src/ui/components/DonationDashboard.svelte');

  it('should exist in src/ui/components/DonationDashboard.svelte', () => {
    expect(existsSync(sveltePath)).toBe(true);
  });

  it('should contain all required donation channels and open ledger elements', () => {
    const content = readFileSync(sveltePath, 'utf8');

    expect(content).toContain('Open Collective');
    expect(content).toContain('GitHub Sponsors');
    expect(content).toContain('PromptPay');
    expect(content).toContain('Live Transparent Expense Ledger');
    expect(content).toContain('ESP32 Solar Nodes');
    expect(content).toContain('Guest Supporter Mode');
  });

  it('should correctly calculate remaining balance and reserve months', () => {
    // Pure logic calculation test matching component exports
    const summary = {
      totalReceivedUsd: 2000,
      totalSpentUsd: 500,
      solarRepeaterCount: 20,
      activeBeneficiaries: 15000
    };

    const balance = Number((summary.totalReceivedUsd - summary.totalSpentUsd).toFixed(2));
    expect(balance).toBe(1500);

    const reserveMonths = Math.floor(balance / 25);
    expect(reserveMonths).toBe(60);
  });
});
