#!/usr/bin/env node
// regenerate-sitemap.mjs — rebuilds sitemap.xml from the actual .html files
// on disk. Fixes "Sitemap and discovered pages diverge" findings caused by
// stale entries or missing new pages.

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(".");
const SITE_URL = "https://www.inklockautomation.com";
const TODAY = new Date().toISOString().slice(0, 10);

const EXCLUDE = new Set(["404.html", "build-onboarding.html", "onboarding.html"]); // private flows
const EXCLUDE_DIRS = ["node_modules", ".git", "api", "build", "assets", "fonts", "scripts"];

function findHtmlFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.includes(entry.name)) continue;
      findHtmlFiles(full, files);
    } else if (entry.name.endsWith(".html") && !EXCLUDE.has(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function urlFromFilename(rel) {
  let p = rel.replace(/\.html$/, "");
  if (p === "index") return "/";
  if (p.endsWith("/index")) p = p.slice(0, -"/index".length);
  return "/" + p;
}

function priorityFor(urlPath) {
  if (urlPath === "/") return "1.0";
  if (urlPath === "/blog") return "0.9";
  if (urlPath.startsWith("/blog/")) return "0.7";
  if (urlPath === "/contact") return "0.6";
  return "0.8";
}

const files = findHtmlFiles(ROOT).sort();
const urls = files.map((f) => {
  const rel = path.relative(ROOT, f);
  const urlPath = urlFromFilename(rel);
  return { loc: SITE_URL + urlPath, lastmod: TODAY, priority: priorityFor(urlPath) };
});

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join("\n")}
</urlset>
`;

fs.writeFileSync(path.join(ROOT, "sitemap.xml"), xml);
console.log(`Wrote sitemap.xml with ${urls.length} URLs.`);
