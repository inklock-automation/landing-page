#!/usr/bin/env node
// final-page-fixes.mjs — kills the last 3 InkLock page-level findings:
//   /blog        FAQPage schema missing on Q&A content
//   /podcast     No question-style headings
//   /services    No question-style headings

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(".");

// ============================================================
// 1. /blog — add FAQPage schema (the index has Q-style blog titles
//    as h2/h3 but no FAQPage to back them up).
// ============================================================

const blogFaq = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What does InkLock Automation actually do?",
      acceptedAnswer: { "@type": "Answer", text: "We build marketing, automation, and operations systems for small businesses that have outgrown spreadsheets and duct tape. The goal: a stack that runs without you holding it together." },
    },
    {
      "@type": "Question",
      name: "Who is InkLock for?",
      acceptedAnswer: { "@type": "Answer", text: "Service businesses with 0-15 employees that are profitable but feel held together by Slack and sticky notes. If you're paying for tools you barely use and re-doing the same admin every week, you're our person." },
    },
    {
      "@type": "Question",
      name: "What topics does the InkLock blog cover?",
      acceptedAnswer: { "@type": "Answer", text: "Marketing systems, AI integration that actually pays off, operations and SOPs, automation pitfalls, and the unglamorous backend work that decides whether marketing converts or doesn't." },
    },
    {
      "@type": "Question",
      name: "How often do you publish new content?",
      acceptedAnswer: { "@type": "Answer", text: "Weekly. Each post answers one specific question small business owners ask us in discovery calls. No fluff, no AI slop, no list of 47 ways to do anything." },
    },
  ],
};

// ============================================================
// 2. Q-style FAQ section template
// ============================================================

function qaSectionBlock(headingId, headingTitle, items) {
  const inner = items.map((it) => `  <h3>${it.q}</h3>\n  <p>${it.a}</p>`).join("\n");
  return `
<!-- INKLOCK_QA_SECTION_INJECTED -->
<section style="padding: 3rem 1.5rem; max-width: 720px; margin: 0 auto;" aria-labelledby="${headingId}">
  <h2 id="${headingId}">${headingTitle}</h2>
${inner}
</section>
<!-- /INKLOCK_QA_SECTION_INJECTED -->
`;
}

function buildFaqSchema(items) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };
}

// ============================================================
// 3. Page-specific Q&A content
// ============================================================

const podcastFaqs = [
  { q: "What is the InkLock podcast about?", a: "Real conversations about the unglamorous work behind growing a service business: operations, marketing systems, AI integration, and the things that go wrong before they go right." },
  { q: "How often does the podcast publish new episodes?", a: "We publish on a bi-weekly cadence, with shorter episode drops in between when something newsworthy hits the small-business tooling world." },
  { q: "Who should listen to this podcast?", a: "Founders and operators of service businesses who want practical takes on systems and automation, not motivational speakers and not pure tech specs." },
];

const servicesFaqs = [
  { q: "What services does InkLock Automation offer?", a: "Three core services: The Foundation Build (custom website + funnel), Marketing & Automation Systems (CRM, sequences, AI workflows), and ongoing Operations Support for clients who need a right-hand team." },
  { q: "How is InkLock different from a marketing agency?", a: "Most agencies sell campaigns. We sell systems. A campaign ends. A system keeps working after we hand off. The deliverable is operational infrastructure, not a deck of ad creatives." },
  { q: "What does a typical engagement cost?", a: "The Foundation Build starts at custom pricing depending on scope. Automation projects scale with complexity. Retainer support starts around $1,500 per month. Discovery call is free and binding on nobody." },
  { q: "How fast can we start?", a: "Discovery call within 48 hours of inquiry. If we're a fit, contract and kickoff inside one week. First deliverables typically land within 10 to 14 days of project start." },
];

// ============================================================
// 4. Apply
// ============================================================

function inject(filepath, ...modifications) {
  let html = fs.readFileSync(filepath, "utf8");
  const original = html;
  for (const m of modifications) {
    if (m.type === "schema-in-head") {
      if (html.includes(m.marker)) {
        console.log(`  -- ${path.relative(ROOT, filepath)} already has ${m.marker.replace("INKLOCK_", "").replace("_", " ").toLowerCase()}`);
        continue;
      }
      const block = `<!-- ${m.marker} -->\n<script type="application/ld+json">\n${JSON.stringify(m.schema)}\n</script>`;
      html = html.replace(/<\/head>/, `${block}\n</head>`);
    } else if (m.type === "qa-section-before-footer") {
      if (html.includes(m.marker)) {
        console.log(`  -- ${path.relative(ROOT, filepath)} already has Q&A section`);
        continue;
      }
      if (html.includes("</footer>")) html = html.replace("</footer>", `${m.htmlBlock}</footer>`);
      else if (html.includes("</body>")) html = html.replace("</body>", `${m.htmlBlock}</body>`);
      else { console.log(`  !! ${path.relative(ROOT, filepath)} no </footer> or </body>`); continue; }
      // Also inject FAQPage schema for the visible Q&A.
      const schemaBlock = `<!-- INKLOCK_QA_FAQ_SCHEMA -->\n<script type="application/ld+json">\n${JSON.stringify(m.faqSchema)}\n</script>`;
      html = html.replace(/<\/head>/, `${schemaBlock}\n</head>`);
    }
  }
  if (html !== original) {
    fs.writeFileSync(filepath, html);
    console.log(`  ✓ ${path.relative(ROOT, filepath)} patched`);
    return true;
  }
  return false;
}

console.log("Final InkLock page fixes:");

inject(path.join(ROOT, "blog/index.html"), {
  type: "schema-in-head",
  marker: "INKLOCK_BLOG_FAQ_INJECTED",
  schema: blogFaq,
});
// /blog and /blog/index are the same file. Cover the root one too:
inject(path.join(ROOT, "blog.html"), {
  type: "schema-in-head",
  marker: "INKLOCK_BLOG_FAQ_INJECTED",
  schema: blogFaq,
});

inject(path.join(ROOT, "podcast.html"), {
  type: "qa-section-before-footer",
  marker: "INKLOCK_QA_SECTION_INJECTED",
  htmlBlock: qaSectionBlock("podcast-faq", "Common questions about the InkLock podcast", podcastFaqs),
  faqSchema: buildFaqSchema(podcastFaqs),
});

inject(path.join(ROOT, "services.html"), {
  type: "qa-section-before-footer",
  marker: "INKLOCK_QA_SECTION_INJECTED",
  htmlBlock: qaSectionBlock("services-faq", "Common questions about our services", servicesFaqs),
  faqSchema: buildFaqSchema(servicesFaqs),
});

console.log("\nDone.");
