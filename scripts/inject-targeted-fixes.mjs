#!/usr/bin/env node
// inject-targeted-fixes.mjs — surgical fixes for the last few InkLock findings.
//
// 1. Add FAQPage schema to /blog/the-90-day-rule (has Q-style h2s, no schema)
// 2. Add Q-style h3 questions section to /blog/stop-automating-chaos
//    (current headings are all statements, no questions)

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(".");

// ============================================================
// 1. FAQPage for /blog/the-90-day-rule
// ============================================================

const ninetyDayFaqs = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Why does marketing take 90 days to show results?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Most marketing channels need 90 days because the first 30 are setup and data collection, the next 30 are optimization based on real signals, and the final 30 are when scale becomes possible. Anything shorter is gambling on a single creative or campaign without the data to know if it actually works.",
      },
    },
    {
      "@type": "Question",
      name: "What happens in month one of a marketing engagement?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Month one is setup and learning. Tracking goes in, audiences get built, creative gets shipped, and the first batch of data starts coming back. Expectations for revenue should be near zero — this is the diagnostic phase, not the scaling phase.",
      },
    },
    {
      "@type": "Question",
      name: "When should you start seeing real marketing results?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Month three. Month two narrows the winners, month three scales what's working. If you kill a campaign before 90 days, you're killing it on insufficient data and likely throwing away spend that was about to pay off.",
      },
    },
    {
      "@type": "Question",
      name: "What is the biggest trap businesses fall into with marketing timelines?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Treating month one revenue as the verdict. Most businesses panic in week three, change strategy, and never give a single approach the runway it needs to actually work. The fix is committing to 90 days before judging.",
      },
    },
  ],
};

function injectFaqPage(filepath, schema) {
  let html = fs.readFileSync(filepath, "utf8");
  if (html.includes("INKLOCK_FAQ_INJECTED")) {
    console.log(`  -- ${path.relative(ROOT, filepath)} (already has FAQPage)`);
    return false;
  }
  if (html.includes('"@type": "FAQPage"') || html.includes('"@type":"FAQPage"')) {
    console.log(`  -- ${path.relative(ROOT, filepath)} (FAQPage already present)`);
    return false;
  }
  const block = `<!-- INKLOCK_FAQ_INJECTED -->\n<script type="application/ld+json">\n${JSON.stringify(schema)}\n</script>`;
  html = html.replace(/<\/head>/, `${block}\n</head>`);
  fs.writeFileSync(filepath, html);
  console.log(`  ✓ ${path.relative(ROOT, filepath)} (FAQPage with ${schema.mainEntity.length} Q&As)`);
  return true;
}

console.log("Targeted fixes:");
injectFaqPage(path.join(ROOT, "blog/the-90-day-rule.html"), ninetyDayFaqs);

// ============================================================
// 2. Add Q-style FAQ section to /blog/stop-automating-chaos
// ============================================================

const chaosBlogQA = `
<!-- INKLOCK_QA_SECTION_INJECTED -->
<section style="padding: 3rem 1.5rem; max-width: 720px; margin: 0 auto;" aria-labelledby="chaos-qa-heading">
  <h2 id="chaos-qa-heading">Common questions about automating chaos</h2>
  <h3>How do you know if a process is ready to automate?</h3>
  <p>A process is ready to automate when you can describe every step out loud without checking anything, and when the same person doing it twice produces the same outcome. Anything fuzzier than that should be cleaned up before you wire it into Zapier or Make.</p>
  <h3>What's the right order: fix the process or build the automation?</h3>
  <p>Fix the process first. Always. The whole reason automation feels disappointing is that most businesses skip step one. A clean manual process automates in an afternoon. A messy one stays messy at machine speed.</p>
  <h3>Why does automating chaos make things worse instead of faster?</h3>
  <p>Because automation amplifies whatever you point it at. A broken handoff that happens once a day becomes a broken handoff that happens 50 times an hour. The cost of fixing the original handoff is now multiplied by the volume the automation enabled.</p>
</section>
<!-- /INKLOCK_QA_SECTION_INJECTED -->
`;

const chaosSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How do you know if a process is ready to automate?",
      acceptedAnswer: { "@type": "Answer", text: "A process is ready to automate when you can describe every step out loud without checking anything, and when the same person doing it twice produces the same outcome. Anything fuzzier should be cleaned up before wiring it into Zapier or Make." },
    },
    {
      "@type": "Question",
      name: "What's the right order: fix the process or build the automation?",
      acceptedAnswer: { "@type": "Answer", text: "Fix the process first. Always. The whole reason automation feels disappointing is that most businesses skip step one. A clean manual process automates in an afternoon. A messy one stays messy at machine speed." },
    },
    {
      "@type": "Question",
      name: "Why does automating chaos make things worse instead of faster?",
      acceptedAnswer: { "@type": "Answer", text: "Because automation amplifies whatever you point it at. A broken handoff that happens once a day becomes a broken handoff that happens 50 times an hour." },
    },
  ],
};

function injectQaSection(filepath, htmlBlock, schema) {
  let html = fs.readFileSync(filepath, "utf8");
  if (html.includes("INKLOCK_QA_SECTION_INJECTED")) {
    console.log(`  -- ${path.relative(ROOT, filepath)} (already has Q&A section)`);
    return false;
  }
  // Inject Q&A section just before </footer> or </body>
  if (html.includes("</footer>")) {
    html = html.replace("</footer>", `${htmlBlock}</footer>`);
  } else if (html.includes("</body>")) {
    html = html.replace("</body>", `${htmlBlock}</body>`);
  } else {
    console.log(`  !! ${path.relative(ROOT, filepath)} (no anchor)`);
    return false;
  }
  // Also inject FAQPage schema
  const schemaBlock = `<!-- INKLOCK_QA_FAQ_SCHEMA -->\n<script type="application/ld+json">\n${JSON.stringify(schema)}\n</script>`;
  html = html.replace(/<\/head>/, `${schemaBlock}\n</head>`);
  fs.writeFileSync(filepath, html);
  console.log(`  ✓ ${path.relative(ROOT, filepath)} (Q&A section + FAQPage schema with ${schema.mainEntity.length} Q&As)`);
  return true;
}

injectQaSection(path.join(ROOT, "blog/stop-automating-chaos.html"), chaosBlogQA, chaosSchema);

console.log("\nDone.");
