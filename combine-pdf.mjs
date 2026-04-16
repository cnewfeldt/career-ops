#!/usr/bin/env node

/**
 * combine-pdf.mjs — Merge cover letter + CV into a single PDF.
 *
 * Usage:
 *   node combine-pdf.mjs <cover.pdf> <cv.pdf> <output.pdf>
 *
 * Convention: cover letter goes FIRST, CV goes SECOND.
 * Requires: pdfunite (poppler-utils). Install on macOS: brew install poppler
 */

import { execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const [,, coverArg, cvArg, outArg] = process.argv;

if (!coverArg || !cvArg || !outArg) {
  console.error('Usage: node combine-pdf.mjs <cover.pdf> <cv.pdf> <output.pdf>');
  process.exit(1);
}

const cover = resolve(coverArg);
const cv = resolve(cvArg);
const out = resolve(outArg);

for (const p of [cover, cv]) {
  if (!existsSync(p)) {
    console.error(`❌ Not found: ${p}`);
    process.exit(1);
  }
}

try {
  execFileSync('pdfunite', [cover, cv, out], { stdio: 'inherit' });
  const kb = (statSync(out).size / 1024).toFixed(1);
  console.log(`✅ Combined PDF: ${out}`);
  console.log(`📦 Size: ${kb} KB`);
} catch (err) {
  console.error('❌ pdfunite failed. Install with: brew install poppler');
  process.exit(1);
}
