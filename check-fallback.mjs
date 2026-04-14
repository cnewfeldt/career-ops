#!/usr/bin/env node

/**
 * check-fallback.mjs -- Careers page fallback for expired ATS URLs
 *
 * When a Lever/Greenhouse/Ashby URL returns 404, the role might still be
 * live on the company's own careers page under a different URL.
 *
 * This script takes expired URLs paired with company names and role titles,
 * looks up the company's careers_url from portals.yml, navigates there with
 * Playwright, and searches for the role title.
 *
 * Usage:
 *   node check-fallback.mjs --company "Kong" --role "Technical Curriculum Developer" --url "https://jobs.lever.co/kong/..."
 *   node check-fallback.mjs --file expired.tsv
 *
 * TSV format (tab-separated): url\tcompany\trole
 *
 * Output: JSON per entry with result (found/not_found), new_url if found
 * Exit code: 0 if any found, 1 if none found
 */

import { chromium } from 'playwright';
import { readFile } from 'fs/promises';

async function loadPortals() {
  try {
    const text = await readFile('portals.yml', 'utf-8');
    // Simple extraction of name + careers_url pairs from YAML
    // Avoids requiring a yaml dependency
    const companies = [];
    let current = null;
    for (const line of text.split('\n')) {
      const nameMatch = line.match(/^\s+-\s+name:\s*['"]?(.+?)['"]?\s*$/);
      const urlMatch = line.match(/^\s+careers_url:\s*['"]?(.+?)['"]?\s*$/);
      if (nameMatch) {
        current = { name: nameMatch[1] };
        companies.push(current);
      } else if (urlMatch && current) {
        current.careers_url = urlMatch[1];
      }
    }
    return companies;
  } catch {
    return [];
  }
}

function findCareersUrl(companies, companyName) {
  const normalized = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const match = companies.find(c => {
    const name = c.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return name === normalized || normalized.includes(name) || name.includes(normalized);
  });
  return match?.careers_url || null;
}

async function searchCareersPage(page, careersUrl, roleTitle) {
  try {
    const response = await page.goto(careersUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    if (!response || response.status() >= 400) {
      return { found: false, reason: `careers page returned HTTP ${response?.status()}` };
    }

    // Wait for SPA hydration -- careers pages are often heavy SPAs
    await page.waitForTimeout(5000);

    // Scroll to trigger lazy-loaded job listings
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2000);

    const bodyText = await page.evaluate(() => document.body?.innerText ?? '');

    // Extract key words from role title for fuzzy matching
    const keywords = roleTitle
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3)
      .filter(w => !['senior', 'junior', 'lead', 'staff', 'manager', 'remote', 'hybrid'].includes(w));

    const bodyLower = bodyText.toLowerCase();

    // Check if enough role keywords appear on the page
    const matched = keywords.filter(kw => bodyLower.includes(kw));
    const matchRatio = keywords.length > 0 ? matched.length / keywords.length : 0;

    if (matchRatio < 0.5) {
      return { found: false, reason: `only ${matched.length}/${keywords.length} keywords found on careers page` };
    }

    // Try to find a link containing the role title keywords
    const links = await page.evaluate((kws) => {
      const anchors = Array.from(document.querySelectorAll('a[href]'));
      return anchors
        .filter(a => {
          const text = (a.innerText || '').toLowerCase();
          const matchCount = kws.filter(kw => text.includes(kw)).length;
          return matchCount >= Math.ceil(kws.length * 0.5);
        })
        .map(a => ({
          text: a.innerText.trim().substring(0, 200),
          href: a.href,
        }))
        .slice(0, 5);
    }, keywords);

    if (links.length > 0) {
      // Verify the first matching link is an actual job posting
      const bestLink = links[0];
      return {
        found: true,
        new_url: bestLink.href,
        title_on_page: bestLink.text,
        reason: `found matching link on careers page (${matched.length}/${keywords.length} keywords)`,
      };
    }

    // Keywords present but no clickable link found
    return {
      found: false,
      reason: `keywords present (${matched.length}/${keywords.length}) but no matching job link found -- may need manual check`,
      hint: careersUrl,
    };

  } catch (err) {
    return { found: false, reason: `navigation error: ${err.message.split('\n')[0]}` };
  }
}

async function main() {
  const args = process.argv.slice(2);

  let entries = [];

  if (args.includes('--file')) {
    const fileIdx = args.indexOf('--file');
    const text = await readFile(args[fileIdx + 1], 'utf-8');
    entries = text
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'))
      .map(l => {
        const [url, company, role] = l.split('\t');
        return { url, company, role };
      });
  } else if (args.includes('--company') && args.includes('--role')) {
    const companyIdx = args.indexOf('--company');
    const roleIdx = args.indexOf('--role');
    const urlIdx = args.indexOf('--url');
    entries = [{
      url: urlIdx >= 0 ? args[urlIdx + 1] : 'unknown',
      company: args[companyIdx + 1],
      role: args[roleIdx + 1],
    }];
  } else {
    console.error('Usage:');
    console.error('  node check-fallback.mjs --company "Kong" --role "Technical Curriculum Developer"');
    console.error('  node check-fallback.mjs --file expired.tsv  (tab-separated: url\\tcompany\\trole)');
    process.exit(1);
  }

  const companies = await loadPortals();
  if (companies.length === 0) {
    console.error('Warning: could not load portals.yml or no tracked_companies found');
  }

  console.log(`Checking ${entries.length} expired posting(s) against company careers pages...\n`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  let found = 0, notFound = 0;

  for (const entry of entries) {
    const careersUrl = findCareersUrl(companies, entry.company);

    if (!careersUrl) {
      console.log(`⏭️  skip       ${entry.company} | ${entry.role}`);
      console.log(`              no careers_url in portals.yml`);
      notFound++;
      continue;
    }

    console.log(`🔍 checking   ${entry.company} | ${entry.role}`);
    console.log(`              careers page: ${careersUrl}`);

    const result = await searchCareersPage(page, careersUrl, entry.role);

    if (result.found) {
      console.log(`✅ FOUND      ${result.title_on_page}`);
      console.log(`              new URL: ${result.new_url}`);
      console.log(`              ${result.reason}`);
      found++;
    } else {
      console.log(`❌ not found  ${result.reason}`);
      if (result.hint) {
        console.log(`              manual check: ${result.hint}`);
      }
      notFound++;
    }
    console.log();
  }

  await browser.close();

  console.log(`Results: ${found} found  ${notFound} not found`);
  process.exit(found > 0 ? 0 : 1);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
