<!--
  OutGrid Mesh - Transparent Community Donation Ledger & Dashboard
  Protocol: Thabot OutGrid Protocol (TOG v1.1)
  Author: Thabot (thabo47@gmail.com)
  License: AGPL-3.0 + Commercial Rights Reserved to Thabot
-->
<script lang="ts">
  export interface ExpenseItem {
    id: string;
    description: string;
    amountUsd: number;
    category: 'cloud' | 'hardware' | 'domain' | 'operations';
    date: string;
  }

  export interface DonationSummary {
    totalReceivedUsd: number;
    totalSpentUsd: number;
    solarRepeaterCount: number;
    activeBeneficiaries: number;
  }

  export let isGuest: boolean = true;
  export let promptPayId: string = '081-xxx-xxxx';
  export let githubSponsorsUrl: string = 'https://github.com/sponsors/thabot';
  export let openCollectiveUrl: string = 'https://opencollective.com/outgrid-mesh';

  export let summary: DonationSummary = {
    totalReceivedUsd: 1450.00,
    totalSpentUsd: 320.00,
    solarRepeaterCount: 18,
    activeBeneficiaries: 12400
  };

  export let expenses: ExpenseItem[] = [
    { id: 'EXP-001', description: 'Cloudflare Workers & D1 Spatial DB', amountUsd: 15.00, category: 'cloud', date: '2026-09-01' },
    { id: 'EXP-002', description: 'ESP32 LoRa Solar Repeater Hardware (x5 units)', amountUsd: 125.00, category: 'hardware', date: '2026-09-05' },
    { id: 'EXP-003', description: 'High-Gain Antennas for Disaster Flood Zones', amountUsd: 80.00, category: 'hardware', date: '2026-09-10' },
    { id: 'EXP-004', description: 'Turn Server Relay Bandwidth (Zero-Cost Baseline)', amountUsd: 0.00, category: 'cloud', date: '2026-09-15' }
  ];

  export function calculateBalance(sum: DonationSummary): number {
    return Number((sum.totalReceivedUsd - sum.totalSpentUsd).toFixed(2));
  }

  export function calculateReserveMonths(balance: number, monthlyAvgExpense: number = 25): number {
    if (monthlyAvgExpense <= 0) return 999;
    return Math.floor(balance / monthlyAvgExpense);
  }

  $: currentBalance = calculateBalance(summary);
  $: reserveMonths = calculateReserveMonths(currentBalance);
</script>

<div class="donation-container" data-testid="donation-dashboard">
  <div class="header-section">
    <h2>🤝 OutGrid Mesh Community Fund</h2>
    <p class="subtitle">
      100% Transparent Open Ledger • Non-Profit Humanitarian Public Good
    </p>
    {#if isGuest}
      <span class="badge guest-badge">Guest Supporter Mode</span>
    {:else}
      <span class="badge verified-badge">Verified Member</span>
    {/if}
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <span class="stat-label">Total Contributions</span>
      <span class="stat-value text-green">${summary.totalReceivedUsd.toFixed(2)}</span>
    </div>
    <div class="stat-card">
      <span class="stat-label">Total Expenses</span>
      <span class="stat-value text-amber">${summary.totalSpentUsd.toFixed(2)}</span>
    </div>
    <div class="stat-card">
      <span class="stat-label">Reserve Balance</span>
      <span class="stat-value text-cyan">${currentBalance.toFixed(2)}</span>
      <span class="stat-note">~{reserveMonths} months of cloud runtime</span>
    </div>
    <div class="stat-card">
      <span class="stat-label">ESP32 Solar Nodes</span>
      <span class="stat-value text-emerald">{summary.solarRepeaterCount} Units</span>
      <span class="stat-note">Serving ~{summary.activeBeneficiaries.toLocaleString()} people</span>
    </div>
  </div>

  <div class="donation-channels">
    <h3>Support Infrastructure & Relief Hardware</h3>
    <div class="channels-grid">
      <a href={openCollectiveUrl} target="_blank" rel="noreferrer" class="channel-btn opencollective">
        <strong>Open Collective</strong>
        <span>Tax-deductible & public donor list</span>
      </a>
      <a href={githubSponsorsUrl} target="_blank" rel="noreferrer" class="channel-btn github">
        <strong>GitHub Sponsors</strong>
        <span>Zero fee developer patronage</span>
      </a>
      <div class="channel-box promptpay">
        <strong>PromptPay (Thailand)</strong>
        <code>{promptPayId}</code>
        <small>Direct to Humanitarian Hardware Fund</small>
      </div>
    </div>
  </div>

  <div class="ledger-section">
    <div class="ledger-header">
      <h3>Live Transparent Expense Ledger</h3>
      <span class="live-dot"></span>
    </div>
    <div class="table-wrapper">
      <table class="ledger-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Category</th>
            <th>Cost (USD)</th>
          </tr>
        </thead>
        <tbody>
          {#each expenses as item}
            <tr>
              <td>{item.date}</td>
              <td>{item.description}</td>
              <td><span class="category-tag {item.category}">{item.category}</span></td>
              <td class="amount">${item.amountUsd.toFixed(2)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>

<style>
  .donation-container {
    padding: 1.5rem;
    background: #0f172a;
    color: #f8fafc;
    border-radius: 0.75rem;
    border: 1px solid #1e293b;
    font-family: system-ui, -apple-system, sans-serif;
  }
  .header-section {
    margin-bottom: 1.5rem;
  }
  .header-section h2 {
    margin: 0 0 0.25rem 0;
    font-size: 1.5rem;
    color: #38bdf8;
  }
  .subtitle {
    margin: 0 0 0.5rem 0;
    color: #94a3b8;
    font-size: 0.875rem;
  }
  .badge {
    display: inline-block;
    padding: 0.2rem 0.5rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
  }
  .guest-badge {
    background: #334155;
    color: #cbd5e1;
  }
  .verified-badge {
    background: #065f46;
    color: #34d399;
  }
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }
  .stat-card {
    background: #1e293b;
    padding: 1rem;
    border-radius: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .stat-label {
    font-size: 0.75rem;
    color: #94a3b8;
    text-transform: uppercase;
  }
  .stat-value {
    font-size: 1.5rem;
    font-weight: 700;
  }
  .stat-note {
    font-size: 0.7rem;
    color: #64748b;
  }
  .text-green { color: #4ade80; }
  .text-amber { color: #fbbf24; }
  .text-cyan { color: #38bdf8; }
  .text-emerald { color: #34d399; }
  .donation-channels {
    margin-bottom: 2rem;
  }
  .donation-channels h3, .ledger-section h3 {
    margin: 0 0 1rem 0;
    font-size: 1.125rem;
  }
  .channels-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }
  .channel-btn, .channel-box {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 0.5rem;
    padding: 1rem;
    text-decoration: none;
    color: inherit;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    transition: border-color 0.2s;
  }
  .channel-btn:hover {
    border-color: #38bdf8;
  }
  .channel-btn strong, .channel-box strong {
    color: #f1f5f9;
  }
  .channel-btn span, .channel-box small {
    font-size: 0.75rem;
    color: #94a3b8;
  }
  .channel-box code {
    font-family: monospace;
    background: #0f172a;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    color: #38bdf8;
    font-size: 0.875rem;
  }
  .ledger-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .live-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #22c55e;
    box-shadow: 0 0 8px #22c55e;
  }
  .table-wrapper {
    overflow-x: auto;
  }
  .ledger-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }
  .ledger-table th, .ledger-table td {
    padding: 0.75rem 0.5rem;
    text-align: left;
    border-bottom: 1px solid #1e293b;
  }
  .ledger-table th {
    color: #94a3b8;
    font-weight: 600;
  }
  .category-tag {
    font-size: 0.7rem;
    padding: 0.15rem 0.4rem;
    border-radius: 0.25rem;
    text-transform: uppercase;
  }
  .category-tag.cloud { background: #0369a1; color: #bae6fd; }
  .category-tag.hardware { background: #854d0e; color: #fef08a; }
  .amount {
    font-weight: 600;
    color: #f8fafc;
  }
</style>
