#!/usr/bin/env node
/**
 * scrape-postsec.mjs — Playwright scraper for post-secondary careers boards
 *
 * Drives real Chromium (the installed playwright lib) through Workday/SPA
 * boards that scan.mjs (zero-token APIs) and batch WebFetch can't read.
 * Extracts job links + titles, filters to Meehae's LXD/ID/teaching archetypes,
 * dedups against scan-history.tsv + applications.md + pipeline.md, prints JSON.
 *
 * Usage: node scrape-postsec.mjs [--all]
 *   (default: prints candidate hits as JSON; does NOT write pipeline.md —
 *    the agent reviews and writes, per the "never auto-apply" ethos)
 */
import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(fileURLToPath(import.meta.url));

// Post-secondary targets. workdayApi = the CXS JSON endpoint (fast, reliable);
// fall back to rendered-page link scrape when no API.
const TARGETS = [
  { name: 'UBC', workdayApi: 'https://ubc.wd10.myworkdayjobs.com/wday/cxs/ubc/ubcstaffjobs/jobs', site: 'ubc.wd10.myworkdayjobs.com' },
  { name: 'UVic', url: 'https://uvic.mua.hrdepartment.com/hr/ats/JobSearch/viewAll' },
  { name: 'VIU', url: 'https://careers.viu.ca/' },
  { name: 'Royal Roads', url: 'https://www.royalroads.ca/careers' },
  { name: 'BCIT', url: 'https://www.bcit.ca/about/employment/' },
  { name: 'KPU', url: 'https://www.kpu.ca/hr/careers' },
  { name: 'Camosun College', url: 'https://camosun.ca/about/employment' },
  { name: 'SFU', url: 'https://www.sfu.ca/human-resources/careers.html' },
];

// Title relevance: at least one POSITIVE, zero NEGATIVE.
const POSITIVE = [
  'instructional design', 'learning designer', 'learning experience', 'educational developer',
  'curriculum', 'educational technology', 'learning technolog', 'teaching and learning',
  'faculty development', 'lecturer', 'instructor', 'sessional', 'professor', 'educator',
  'digital learning', 'online learning', 'e-learning', 'elearning', 'course design',
  'computer science', 'digital media', 'creative technolog', 'interactive', 'animation',
  'unity', 'game', 'xr', 'vr ', 'immersive', 'media arts',
];
const NEGATIVE = [
  'nurse', 'physician', 'custodian', 'janitor', 'trades', 'plumb', 'electrician',
  'accountant', 'payroll', 'advancement', 'development officer', 'fundrais',
  'athletic', 'coach', 'security', 'groundskeeper', 'food service', 'chef', 'cook',
  'special education', 'inclusion support', 'behaviour', 'iep', 'counsel',
  'nursing', 'dental', 'pharmac', 'social work', 'admissions', 'recruiter',
];

function titleRelevant(t) {
  const s = (t || '').toLowerCase();
  if (!s.trim()) return false;
  if (NEGATIVE.some(n => s.includes(n))) return false;
  return POSITIVE.some(p => s.includes(p));
}

function loadSeenUrls() {
  const seen = new Set();
  for (const f of ['data/scan-history.tsv', 'data/pipeline.md', 'data/applications.md']) {
    const p = join(ROOT, f);
    if (!existsSync(p)) continue;
    const txt = readFileSync(p, 'utf8');
    for (const m of txt.matchAll(/https?:\/\/[^\s|)<>"']+/g)) seen.add(m[0].replace(/[.,)]+$/, ''));
  }
  return seen;
}

async function scrapeWorkdayApi(target) {
  // Workday CXS API: POST JSON, paginate by offset.
  const out = [];
  try {
    for (let offset = 0; offset < 100; offset += 20) {
      const res = await fetch(target.workdayApi, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36' },
        body: JSON.stringify({ appliedFacets: {}, limit: 20, offset, searchText: '' }),
      });
      if (!res.ok) { out.push({ _error: `HTTP ${res.status}` }); break; }
      const json = await res.json();
      const posts = json.jobPostings || [];
      if (!posts.length) break;
      const host = 'https://' + target.site.replace(/\/wday.*/, '');
      for (const p of posts) {
        const path = p.externalPath || p.externalUrl || '';
        out.push({ title: p.title, url: path.startsWith('http') ? path : host + path, location: p.locationsText || '' });
      }
      if (posts.length < 20) break;
    }
  } catch (e) { out.push({ _error: e.message }); }
  return out;
}

async function scrapeRendered(page, target) {
  const out = [];
  try {
    await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 40000 });
    await page.waitForTimeout(4500); // let SPA hydrate
    const links = await page.evaluate(() => {
      const seen = new Set(); const res = [];
      for (const a of document.querySelectorAll('a[href]')) {
        const text = (a.innerText || a.textContent || '').trim().replace(/\s+/g, ' ');
        const href = a.href;
        if (!text || text.length < 4 || text.length > 140) continue;
        if (!/job|career|posting|position|requisition|/.test(href)) {}
        const key = text + '|' + href;
        if (seen.has(key)) continue; seen.add(key);
        res.push({ text, href });
      }
      return res;
    });
    for (const l of links) out.push({ title: l.text, url: l.href, location: '' });
  } catch (e) { out.push({ _error: e.message }); }
  return out;
}

const seen = loadSeenUrls();
const browser = await chromium.launch({ headless: true });
const results = {};
try {
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 2200 }, locale: 'en-CA',
  });
  for (const t of TARGETS) {
    const page = await ctx.newPage();
    let raw = t.workdayApi ? await scrapeWorkdayApi(t) : await scrapeRendered(page, t);
    await page.close();
    const errs = raw.filter(r => r._error).map(r => r._error);
    const jobs = raw.filter(r => r.title);
    const relevant = jobs.filter(j => titleRelevant(j.title));
    const fresh = relevant.filter(j => !seen.has((j.url || '').replace(/[.,)]+$/, '')));
    results[t.name] = {
      method: t.workdayApi ? 'workday-api' : 'rendered',
      total: jobs.length, relevant: relevant.length, fresh: fresh.length,
      errors: errs,
      hits: fresh.slice(0, 25).map(j => ({ title: j.title, url: j.url, location: j.location })),
    };
  }
} finally {
  await browser.close();
}
console.log(JSON.stringify(results, null, 2));
