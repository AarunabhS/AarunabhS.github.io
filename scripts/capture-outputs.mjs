/** Capture the updated React UI with explicitly illustrative API fixtures.
 * The original repository and its databases are never modified or connected.
 * Usage: PLAYWRIGHT_MODULE=/path/to/playwright node scripts/capture-outputs.mjs /path/to/Threat_scoring_app
 */
import { mkdtemp, mkdir, cp, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(process.argv[2]);
const frontend = join(source, 'frontend');
const temporary = await mkdtemp(join(tmpdir(), 'portfolio-output-capture-'));
const companyNames = ['Northstar Analytics', 'Meridian AI', 'Atlas Data Labs', 'Haven Cloud'];
const roleFamilies = ['AI & Machine Learning', 'Data Engineering', 'Cloud Platforms', 'Product & Delivery'];
const locations = ['Toronto, Canada', 'London, UK', 'New York, US'];
const jobs = Array.from({ length: 60 }, (_, i) => ({
  id: `demo-job-${i + 1}`,
  company_name: companyNames[i % 4],
  title: ['Machine Learning Engineer', 'Data Platform Engineer', 'Cloud Architect', 'Technical Product Manager'][i % 4],
  strategic_category: roleFamilies[i % 4],
  location: locations[i % 3],
  location_group: ['Canada', 'United Kingdom', 'United States'][i % 3],
  seniority: i % 5 === 0 ? 'Lead' : 'Senior',
  posted_at: `2026-09-${String(30 - (i % 25)).padStart(2, '0')}`,
  description_excerpt: 'Illustrative role used to demonstrate filtering and talent-market summaries. This is not a real job opening.',
  signals: [roleFamilies[i % 4], i % 2 ? 'Capability expansion' : 'Hiring activity'],
}));
const rows = companyNames.map((name, i) => ({
  company_id: `demo-company-${i}`, company_name: name,
  summary: 'Fictional company used for a public product walkthrough.',
  services: 'Data engineering, AI consulting, Cloud platforms',
  segments: 'Retail, Technology, Manufacturing',
  tech: 'Python, SQL, AWS, LangChain',
  region: ['Canada', 'United States', 'United Kingdom', 'Canada'][i], size_band: '51–200',
  final_threat_score: 6.2 + i * 0.5, csf_threat_score: 5.8 + i * 0.6, llm_threat_score: 6.5 + i * 0.4,
  competitive_impact: i < 2 ? 'HIGH' : 'MEDIUM',
  snapshot_date: '2026-09-30', activity_recency: 2 + i,
  trend_hiring: true, tech_stack_pivot: i < 2, market_expansion: i === 2,
  capability_expansion: true, new_product_line: i === 1, inactive: false,
  active_signals: ['Hiring Trend', 'Capability Expansion'], tags: ['demo', 'ai', 'cloud'],
  job_postings_count: 15, social_posts_count: 8,
  insight_summary: 'Illustrative hiring and capability signals for a fictional company. Review underlying evidence before forming a business conclusion.',
  recommended_action: 'Review the source evidence and compare changes over time.',
  flag_details: { trend_hiring: 'Illustrative dataset contains 15 roles for this company.', capability_expansion: 'Example technology keywords include Python, SQL, AWS and LangChain.' },
}));
const months = Array.from({length: 6}, (_, i) => `2026-${String(i + 4).padStart(2, '0')}-01`);
const overview = {
  window: { months: 6, start_month: months[0], end_month: months[5], generated_at: '2026-09-30T06:00:00Z', latest_snapshot_date: '2026-09-30' },
  kpis: { companies_tracked: 4, average_final_threat_score: 6.95, average_llm_threat_score: 7.1, high_impact_companies: 2, active_signal_companies: 4, inactive_companies: 0 },
  company_rows: rows,
  monthly_trend: months.map((month, i) => ({month, avg_final_threat_score: 5.5 + i * 0.29, avg_csf_threat_score: 5.3 + i * 0.26, avg_llm_threat_score: 5.8 + i * 0.26, companies_count: 4})),
  company_score_trend: rows.flatMap(row => months.map((month, i) => ({company_id: row.company_id, company_name: row.company_name, month, final_threat_score: row.final_threat_score - (5 - i) * 0.25, csf_threat_score: row.csf_threat_score - (5 - i) * 0.2, llm_threat_score: row.llm_threat_score - (5 - i) * 0.22, threat_score_delta: 0.25}))),
  signal_breakdown: [ {signal: 'Hiring Trend', count: 4}, {signal: 'Tech Pivot', count: 2}, {signal: 'Market Expansion', count: 1}, {signal: 'Capability Expansion', count: 4}, {signal: 'New Product Line', count: 1} ],
  impact_breakdown: [{competitive_impact: 'HIGH', count: 2}, {competitive_impact: 'MEDIUM', count: 2}],
};
const talent = { jobs, brief: { summary: 'An illustrative dataset of 60 roles across four fictional companies, three markets and four capability lanes.', highlights: ['Filter by company, market or capability.', 'Open a role to understand the signal behind the summary.'] } };
await mkdir(join(root, 'data'), { recursive: true });
await mkdir(join(root, 'images/outputs'), { recursive: true });
await writeFile(join(root, 'data/talent-demo.json'), JSON.stringify({ source: 'Illustrative API fixture for Threat_scoring_app/TalentRadar.jsx; fictional companies and jobs', kind: 'synthetic', commit: execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], {encoding:'utf8'}).trim(), ...talent }, null, 2) + '\n');
for (const path of ['src', 'index.html', 'package.json', 'tailwind.config.js', 'postcss.config.js']) {
  await cp(join(frontend, path), join(temporary, path), {recursive: true});
}
await symlink(join(frontend, 'node_modules'), join(temporary, 'node_modules'), 'dir');
await writeFile(join(temporary, 'vite.config.js'), "import {defineConfig} from 'vite'; import react from '@vitejs/plugin-react'; export default defineConfig({plugins:[react()],server:{host:'127.0.0.1',port:5186,strictPort:true}});\n");
const server = spawn(process.execPath, [join(frontend, 'node_modules/vite/bin/vite.js'), '--config', join(temporary,'vite.config.js')], {cwd:temporary, stdio:['ignore','pipe','pipe']});
let serverLog = '';
server.stdout.on('data', data => { serverLog += data; });
server.stderr.on('data', data => { serverLog += data; });
let browser;
try {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch('http://127.0.0.1:5186')).ok) break; } catch {}
    if (server.exitCode !== null) throw new Error(serverLog);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({channel:process.env.BROWSER_CHANNEL || 'chrome', headless:true});
  const page = await browser.newPage({viewport:{width:1440,height:1080},deviceScaleFactor:1});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    const payload = path === '/api/insights' ? rows : path.includes('talent-radar') ? talent : overview;
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(payload)});
  });
  await page.goto('http://127.0.0.1:5186', {waitUntil:'networkidle'});
  await page.evaluate(() => {
    const banner = document.createElement('div');
    banner.textContent = 'PORTFOLIO WALKTHROUGH · FICTIONAL SAMPLE DATA · Original project interface';
    banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#163e38;color:#d4f8ed;padding:10px 20px;text-align:center;font:11px system-ui;letter-spacing:1.5px';
    document.body.append(banner);
    document.querySelectorAll('span').forEach(el => {if(el.textContent === 'System Live') el.textContent='Sample walkthrough';});
  });
  for (const [label, filename] of [['Insight Engine','threat-insight-engine.png'],['Talent Radar','threat-talent-radar.png'],['Competitive Profile','threat-competitive-profile.png']]) {
    await page.getByRole('button', {name:label,exact:true}).click();
    await page.waitForTimeout(1200);
    await page.screenshot({path:join(root,'images/outputs',filename),animations:'disabled'});
    console.log(`Captured ${label}`);
  }
  if(errors.length) throw new Error(errors.join('\n'));
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
