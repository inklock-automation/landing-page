#!/usr/bin/env node
// manual-title-rewrites.mjs — 6 blog titles need hand-written shortenings.

import fs from "node:fs";
import path from "node:path";

const REWRITES = {
  "healthcare-ads-not-converting.html": "Why healthcare ads fail at the backend conversion",  // 50
  "the-metric-that-actually-matters.html": "Tracking the wrong number? Here's the one that matters",  // 54
  "the-referral-system-you-dont-have.html": "Referrals are your best channel. So why no system?",  // 51
  "the-second-half-reset.html": "The second-half reset: how to change course mid-year",  // 53
  "write-your-sops-like-someone-else-runs-them.html": "Write your SOPs like someone else runs them",  // 43
  "your-pipeline-is-lying-to-you.html": "Your pipeline is lying. Here's how to fix it in CRM",  // 52
};

let touched = 0;
for (const [filename, newTitle] of Object.entries(REWRITES)) {
  const filepath = path.resolve("blog", filename);
  if (!fs.existsSync(filepath)) {
    console.log(`  skip ${filename} (not found)`);
    continue;
  }
  let html = fs.readFileSync(filepath, "utf8");
  const original = html;
  const oldTitle = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${newTitle}</title>`);
  html = html.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${newTitle}">`);
  html = html.replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${newTitle}">`);
  if (html !== original) {
    fs.writeFileSync(filepath, html);
    console.log(`  ✓ ${filename} (${oldTitle.length}→${newTitle.length}): ${newTitle}`);
    touched++;
  }
}
console.log(`\nDone. ${touched} of ${Object.keys(REWRITES).length} titles rewritten.`);
