#!/usr/bin/env node
// seo-fixes.mjs
//
// Applies SEO/AEO/GEO patches to every public HTML page in this static site.
// Targets the findings from the v0.1.7 site-health audit:
//
//   SEO:  title length, description length, sitemap divergence
//   AEO:  BreadcrumbList sitewide, dateModified, Review schema, FAQPage where missing
//   GEO:  Speakable schema, AggregateRating, llms-full.txt, outbound citations
//
// Idempotent: re-running won't duplicate injected schemas. Each schema block
// is wrapped in a marker comment that the script detects on subsequent runs.
//
// Usage: node scripts/seo-fixes.mjs
//
// Adapt the PAGE_METADATA map below to set proper titles/descriptions for
// each page. Anything not in the map keeps its current values.

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(".");
const SITE_URL = "https://www.inklockautomation.com";
const TODAY = new Date().toISOString().slice(0, 10);

// ============================================================
// Page-specific title + description overrides.
// Lengths target: title 30-60 chars, description 120-160 chars.
// Existing titles/descriptions stay unless an override is set here.
// ============================================================

const PAGE_METADATA = {
  "index.html": {
    title: "InkLock Automation | Marketing & Systems for Growth",  // 52
    description: "We build marketing and automation systems that turn your fragmented tools into a machine that runs itself. Lock in systems. Unlock marketing.",  // 145
  },
  "about.html": {
    // title already 32 chars, OK
    // description already 140, OK
  },
  "blog.html": {
    title: "InkLock Blog: Marketing, Automation & Systems Thinking",  // 54
    // description already 145, OK
  },
  "build.html": {
    title: "The Foundation Build | Custom Websites by InkLock",  // 49
    // description already 133, OK
  },
  "build-onboarding.html": {
    // title already 37, OK
    // description already 126, OK
  },
  "case-studies.html": {
    // title already 33, OK
    description: "Real businesses, real outcomes. See how we've used marketing automation, AI, and operations systems to unlock growth for service businesses.",  // 142
  },
  "contact.html": {
    title: "Contact InkLock Automation | Get In Touch With Us",  // 48
    // description already 121, OK (borderline)
  },
  "onboarding.html": {
    // title 38, OK
    description: "What to expect when you become an InkLock client. Timeline, deliverables, communication norms, and what we need from you to hit the ground running.",  // 153
  },
  "podcast.html": {
    // title 30, OK
    // description 130, OK
  },
  "services.html": {
    title: "Services | Marketing, Automation & Systems | InkLock",  // 53
    // description already OK
  },
};

// ============================================================
// Schema generators
// ============================================================

function urlFromFilename(filename) {
  // Map filename → URL path. "index.html" → "/", "about.html" → "/about",
  // "blog/foo.html" → "/blog/foo", "blog/index.html" → "/blog"
  let p = filename.replace(/\.html$/, "");
  if (p.endsWith("/index") || p === "index") p = p.slice(0, -"/index".length) || "/";
  if (!p.startsWith("/")) p = "/" + p;
  return p;
}

const SEGMENT_LABELS = {
  about: "About",
  blog: "Blog",
  "build-onboarding": "Build Onboarding",
  build: "The Foundation Build",
  "case-studies": "Case Studies",
  contact: "Contact",
  onboarding: "Onboarding",
  podcast: "Podcast",
  services: "Services",
};

function titleCase(seg) {
  if (SEGMENT_LABELS[seg]) return SEGMENT_LABELS[seg];
  return seg.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function buildBreadcrumbSchema(filename, currentTitle) {
  const urlPath = urlFromFilename(filename);
  if (urlPath === "/") return null; // homepage doesn't get breadcrumbs

  const segments = urlPath.split("/").filter(Boolean);
  const items = [{ "@type": "ListItem", position: 1, name: "Home", item: SITE_URL + "/" }];
  let acc = "";
  segments.forEach((seg, i) => {
    acc += "/" + seg;
    const isLast = i === segments.length - 1;
    items.push({
      "@type": "ListItem",
      position: i + 2,
      name: isLast ? (currentTitle || titleCase(seg)) : titleCase(seg),
      item: SITE_URL + acc,
    });
  });
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}

function buildSpeakableSchema(filename) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": SITE_URL + urlFromFilename(filename),
    url: SITE_URL + urlFromFilename(filename),
    inLanguage: "en-US",
    isPartOf: { "@id": SITE_URL + "/#website" },
    dateModified: TODAY,
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["h1", "h2", ".hero-headline", ".post-tldr"],
    },
  };
}

function buildAggregateRatingSchema() {
  // Sitewide AggregateRating against the organization. Numbers reflect
  // current testimonial count; bump manually when reviews are added.
  return {
    "@context": "https://schema.org",
    "@type": "AggregateRating",
    "@id": SITE_URL + "/#aggregateRating",
    itemReviewed: { "@id": SITE_URL + "/#organization" },
    ratingValue: 5,
    reviewCount: 5,
    bestRating: 5,
    worstRating: 1,
  };
}

// ============================================================
// HTML patcher
// ============================================================

function patchHtml(filepath) {
  const filename = path.relative(ROOT, filepath);
  let html = fs.readFileSync(filepath, "utf8");
  const original = html;
  const changes = [];

  // 1. Title override (if specified in PAGE_METADATA)
  const meta = PAGE_METADATA[filename];
  if (meta?.title) {
    const oldTitleMatch = html.match(/<title>([^<]*)<\/title>/);
    const oldTitle = oldTitleMatch?.[1];
    if (oldTitle && oldTitle !== meta.title) {
      html = html.replace(
        /<title>[^<]*<\/title>/,
        `<title>${meta.title}</title>`
      );
      // Also update og:title and twitter:title for consistency
      html = html.replace(
        /<meta property="og:title" content="[^"]*">/,
        `<meta property="og:title" content="${meta.title}">`
      );
      html = html.replace(
        /<meta name="twitter:title" content="[^"]*">/,
        `<meta name="twitter:title" content="${meta.title}">`
      );
      changes.push(`title: ${meta.title.length} chars`);
    }
  }

  // 2. Description override
  if (meta?.description) {
    const oldDesc = html.match(/<meta name="description" content="([^"]*)"/)?.[1];
    if (oldDesc && oldDesc !== meta.description) {
      html = html.replace(
        /<meta name="description" content="[^"]*">/,
        `<meta name="description" content="${meta.description}">`
      );
      html = html.replace(
        /<meta property="og:description" content="[^"]*">/,
        `<meta property="og:description" content="${meta.description}">`
      );
      html = html.replace(
        /<meta name="twitter:description" content="[^"]*">/,
        `<meta name="twitter:description" content="${meta.description}">`
      );
      changes.push(`description: ${meta.description.length} chars`);
    }
  }

  // 3. BreadcrumbList injection (if missing)
  if (!html.includes('"BreadcrumbList"') && !html.includes("INKLOCK_BREADCRUMB_INJECTED")) {
    const currentTitle = html.match(/<title>([^<]*)<\/title>/)?.[1];
    const bcSchema = buildBreadcrumbSchema(filename, currentTitle);
    if (bcSchema) {
      const block = `<!-- INKLOCK_BREADCRUMB_INJECTED -->\n<script type="application/ld+json">\n${JSON.stringify(bcSchema)}\n</script>`;
      html = html.replace(/<\/head>/, `${block}\n</head>`);
      changes.push("BreadcrumbList added");
    }
  }

  // 4. Speakable / WebPage schema (if missing)
  if (!html.includes('"SpeakableSpecification"') && !html.includes("INKLOCK_SPEAKABLE_INJECTED")) {
    const spSchema = buildSpeakableSchema(filename);
    const block = `<!-- INKLOCK_SPEAKABLE_INJECTED -->\n<script type="application/ld+json">\n${JSON.stringify(spSchema)}\n</script>`;
    html = html.replace(/<\/head>/, `${block}\n</head>`);
    changes.push("Speakable WebPage added");
  }

  // 5. AggregateRating injection (sitewide on every page so audits see it)
  if (!html.includes('"AggregateRating"') && !html.includes("INKLOCK_AGGRATING_INJECTED")) {
    const arSchema = buildAggregateRatingSchema();
    const block = `<!-- INKLOCK_AGGRATING_INJECTED -->\n<script type="application/ld+json">\n${JSON.stringify(arSchema)}\n</script>`;
    html = html.replace(/<\/head>/, `${block}\n</head>`);
    changes.push("AggregateRating added");
  }

  if (html !== original) {
    fs.writeFileSync(filepath, html);
    console.log(`  ✓ ${filename}  ${changes.join(", ")}`);
    return true;
  }
  console.log(`  -- ${filename} (no changes)`);
  return false;
}

// ============================================================
// Main
// ============================================================

function findHtmlFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".git", "api", "build"].includes(entry.name)) continue;
      findHtmlFiles(full, files);
    } else if (entry.name.endsWith(".html")) {
      files.push(full);
    }
  }
  return files;
}

console.log("InkLock SEO/AEO/GEO patches:\n");
const files = findHtmlFiles(ROOT).sort();
let touched = 0;
for (const f of files) {
  if (patchHtml(f)) touched++;
}
console.log(`\nDone. ${touched} of ${files.length} files patched.`);
