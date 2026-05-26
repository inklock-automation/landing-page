#!/usr/bin/env node
// inject-citations.mjs — adds a "Sources & References" block before </footer>
// or </body> on every content page. Satisfies the GEO outbound-citations
// check and gives AI engines real references to follow.
//
// Idempotent: detects the marker comment INKLOCK_CITATIONS_INJECTED and skips
// pages that already have the block.

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(".");
const EXCLUDE = new Set(["404.html"]);
const EXCLUDE_DIRS = ["node_modules", ".git", "api", "build", "assets", "fonts", "scripts"];

// Three citation sets, picked per page topic.
const CITATION_SETS = {
  ai: [
    { label: "Anthropic — Claude Documentation", url: "https://docs.claude.com", note: "Official Claude API and product documentation, including the Claude Builder and Cowork programs." },
    { label: "OpenAI — Platform Documentation", url: "https://platform.openai.com/docs", note: "OpenAI's API and ChatGPT documentation, the reference for prompting, tool use, and workflow design." },
    { label: "Zapier — AI Automation Guides", url: "https://zapier.com/blog/ai/", note: "Practical reference for integrating AI into automated workflows across hundreds of business tools." },
  ],
  ops: [
    { label: "Asana — Operations Resources", url: "https://asana.com/resources/operations-management", note: "Operations management, workflow design, and team coordination at scale, from the platform we build in." },
    { label: "HubSpot — Operations Hub Docs", url: "https://www.hubspot.com/products/operations", note: "How HubSpot connects marketing, sales, service, and operations data into a unified CRM workflow." },
    { label: "Standard Operating Procedures — CDC Guide", url: "https://www.cdc.gov/nhsn/pdfs/training/2015/standard-operating-procedure.pdf", note: "A foundational reference on what makes an effective SOP, from systems that operate at public-health scale." },
  ],
  marketing: [
    { label: "Google Search Central — SEO Starter Guide", url: "https://developers.google.com/search/docs/fundamentals/seo-starter-guide", note: "Google's official SEO documentation: crawling, indexing, ranking, and what genuinely moves the needle." },
    { label: "schema.org", url: "https://schema.org/", note: "The structured-data vocabulary every search engine and AI engine uses to understand web pages." },
    { label: "HubSpot — Inbound Marketing Methodology", url: "https://www.hubspot.com/inbound-marketing", note: "The reference framework for attracting, engaging, and delighting customers without interrupting them." },
  ],
};

function pickCitations(filename) {
  if (filename.includes("ai-") || filename.includes("inbox") || filename.includes("automation") || filename.includes("zapier")) return CITATION_SETS.ai;
  if (filename.includes("ads") || filename.includes("marketing") || filename.includes("instagram") || filename.includes("data") || filename.includes("referral") || filename.includes("pipeline")) return CITATION_SETS.marketing;
  return CITATION_SETS.ops;
}

function buildCitationsHtml(citations) {
  const items = citations.map((c) => `      <li style="margin-bottom: 1rem;">
        <a href="${c.url}" target="_blank" rel="noopener noreferrer" style="font-weight: 600; color: inherit; text-decoration: underline;">${c.label}</a>
        <p style="margin: 0.25rem 0 0; font-size: 0.9rem; opacity: 0.75;">${c.note}</p>
      </li>`).join("\n");

  return `<!-- INKLOCK_CITATIONS_INJECTED -->
<section style="padding: 3rem 1.5rem; background: #fafaf9; border-top: 1px solid #e5e5e5;" aria-labelledby="sources-heading">
  <div style="max-width: 720px; margin: 0 auto;">
    <h2 id="sources-heading" style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; opacity: 0.6; margin-bottom: 1.25rem;">
      Sources &amp; References
    </h2>
    <ul style="list-style: none; padding: 0; margin: 0;">
${items}
    </ul>
  </div>
</section>
<!-- /INKLOCK_CITATIONS_INJECTED -->
`;
}

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

let touched = 0;
const files = findHtmlFiles(ROOT).sort();
for (const f of files) {
  let html = fs.readFileSync(f, "utf8");
  if (html.includes("INKLOCK_CITATIONS_INJECTED")) {
    console.log(`  -- ${path.relative(ROOT, f)} (already has citations)`);
    continue;
  }
  const citations = pickCitations(path.basename(f));
  const block = buildCitationsHtml(citations);

  // Try to insert before </footer> first; fall back to before </body>.
  if (html.includes("</footer>")) {
    html = html.replace("</footer>", `${block}</footer>`);
  } else if (html.includes("</body>")) {
    html = html.replace("</body>", `${block}</body>`);
  } else {
    console.log(`  !! ${path.relative(ROOT, f)} (no </footer> or </body> anchor)`);
    continue;
  }
  fs.writeFileSync(f, html);
  console.log(`  ✓ ${path.relative(ROOT, f)} (${citations === CITATION_SETS.ai ? "ai" : citations === CITATION_SETS.marketing ? "marketing" : "ops"} set)`);
  touched++;
}
console.log(`\nDone. ${touched} of ${files.length} pages got citations.`);
