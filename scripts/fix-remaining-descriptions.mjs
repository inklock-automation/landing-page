#!/usr/bin/env node
// fix-remaining-descriptions.mjs — 4 blog posts still have descriptions over
// 160 chars. Replace with hand-written tighter versions in the 130-155 range.

import fs from "node:fs";
import path from "node:path";

const REWRITES = {
  "break-up-with-your-broken-systems.html":
    "You deserve better than the systems you're tolerating. The CRM nobody uses, the automation that almost works. Today is the day to fix it.",  // 137
  "stop-buying-tools-start-buying-outcomes.html":
    "Most businesses have a graveyard of half-used software. The problem was never the tools. Nobody decided what they were supposed to accomplish.",  // 144
  "the-metric-that-actually-matters.html":
    "Likes, followers, and impressions feel like progress but rarely predict revenue. Here's the small set of numbers that actually predict it.",  // 140
  "the-referral-system-you-dont-have.html":
    "Most service businesses call referrals their top source of clients, then leave them entirely to luck. Build a system that doesn't rely on hope.",  // 145
};

let touched = 0;
for (const [filename, newDesc] of Object.entries(REWRITES)) {
  const filepath = path.resolve("blog", filename);
  let html = fs.readFileSync(filepath, "utf8");
  const original = html;
  const oldDesc = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "";
  html = html.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${newDesc}">`);
  html = html.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${newDesc}">`);
  html = html.replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${newDesc}">`);
  if (html !== original) {
    fs.writeFileSync(filepath, html);
    console.log(`  ✓ ${filename} (${oldDesc.length}→${newDesc.length})`);
    touched++;
  }
}
console.log(`\nDone. ${touched} of ${Object.keys(REWRITES).length} descriptions tightened.`);
