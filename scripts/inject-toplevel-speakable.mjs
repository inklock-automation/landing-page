#!/usr/bin/env node
// inject-toplevel-speakable.mjs — adds a TOP-LEVEL Speakable WebPage schema
// to blog posts that have speakable nested inside BlogPosting but no top-
// level standalone block. Audit engines check @type at the top of each
// JSON-LD block, not nested properties, so the nested form was invisible.

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(".");
const SITE_URL = "https://www.inklockautomation.com";
const TODAY = new Date().toISOString().slice(0, 10);

function urlFromFilename(rel) {
  let p = rel.replace(/\.html$/, "");
  if (p === "index") return "/";
  if (p.endsWith("/index")) p = p.slice(0, -"/index".length);
  return "/" + p;
}

function buildSpeakable(rel) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": SITE_URL + urlFromFilename(rel),
    url: SITE_URL + urlFromFilename(rel),
    inLanguage: "en-US",
    isPartOf: { "@id": SITE_URL + "/#website" },
    dateModified: TODAY,
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["h1", "h2", ".hero-headline", ".post-tldr", ".post-faq"],
    },
  };
}

// Look for the marker. If page already has the INKLOCK_SPEAKABLE_INJECTED
// marker, the seo-fixes.mjs added it. Otherwise it had nested Speakable
// inside BlogPosting and we never injected a top-level block.
const blogDir = path.join(ROOT, "blog");
const files = fs.readdirSync(blogDir).filter((f) => f.endsWith(".html") && f !== "index.html");

let touched = 0;
for (const filename of files) {
  const filepath = path.join(blogDir, filename);
  let html = fs.readFileSync(filepath, "utf8");

  if (html.includes("INKLOCK_SPEAKABLE_INJECTED")) {
    console.log(`  -- blog/${filename} (already has top-level Speakable)`);
    continue;
  }

  const rel = "blog/" + filename;
  const schema = buildSpeakable(rel);
  const block = `<!-- INKLOCK_SPEAKABLE_INJECTED -->\n<script type="application/ld+json">\n${JSON.stringify(schema)}\n</script>`;

  if (!html.includes("</head>")) {
    console.log(`  !! blog/${filename} (no </head> anchor)`);
    continue;
  }
  html = html.replace(/<\/head>/, `${block}\n</head>`);
  fs.writeFileSync(filepath, html);
  console.log(`  ✓ blog/${filename}`);
  touched++;
}
console.log(`\nDone. ${touched} blog posts got top-level Speakable.`);
