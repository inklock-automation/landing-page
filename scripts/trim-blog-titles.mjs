#!/usr/bin/env node
// trim-blog-titles.mjs — many blog post titles run 60-87 chars because they
// have "| InkLock" appended. Strip the suffix when the headline alone is
// already meaningful (most are). Falls back to leaving title alone if the
// trimmed version is too short.

import fs from "node:fs";
import path from "node:path";

const BLOG_DIR = path.resolve("blog");
const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".html") && f !== "index.html");

let touched = 0;
for (const filename of files) {
  const filepath = path.join(BLOG_DIR, filename);
  let html = fs.readFileSync(filepath, "utf8");
  const original = html;

  const titleMatch = html.match(/<title>([^<]*)<\/title>/);
  if (!titleMatch) continue;
  const oldTitle = titleMatch[1];
  const oldLen = oldTitle.length;

  // Only act if the title is too long.
  if (oldLen <= 60) {
    console.log(`  -- ${filename} (${oldLen} chars, already OK)`);
    continue;
  }

  // Try trimming " | InkLock" first.
  let newTitle = oldTitle.replace(/\s*\|\s*InkLock\s*$/, "").trim();
  let newLen = newTitle.length;

  // If still too long, leave alone — needs manual rewrite.
  if (newLen > 60) {
    console.log(`  !! ${filename} (${oldLen}→${newLen} after suffix strip, still too long, manual rewrite needed)`);
    continue;
  }
  // If trimmed too short, leave alone.
  if (newLen < 30) {
    console.log(`  -- ${filename} (${oldLen}→${newLen} too short after trim, leaving)`);
    continue;
  }

  html = html.replace(/<title>[^<]*<\/title>/, `<title>${newTitle}</title>`);
  html = html.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${newTitle}">`);
  html = html.replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${newTitle}">`);

  if (html !== original) {
    fs.writeFileSync(filepath, html);
    console.log(`  ✓ ${filename}  (${oldLen}→${newLen}): ${newTitle}`);
    touched++;
  }
}
console.log(`\nDone. ${touched} of ${files.length} blog titles trimmed.`);
