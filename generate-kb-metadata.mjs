#!/usr/bin/env node
/**
 * Generate Bedrock Knowledge Base metadata sidecars for docs-corpus/*.md
 *
 * Usage:
 *   node scripts/generate-kb-metadata.mjs
 *   node scripts/generate-kb-metadata.mjs --dry-run
 *
 * Env:
 *   DOCS_BASE_URL   Site root, e.g. http://charge-st-docs.s3-website.il-central-1.amazonaws.com
 *   DOCS_ROUTE_PREFIX  Default: docs  (Docusaurus routeBasePath)
 *   CORPUS_DIR      Default: docs-corpus
 *   VISIBILITY      Default: public  (public | support | admin)
 *   SKIP_README     Default: true
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");

const corpusDir = path.resolve(repoRoot, "charging-stations-repo/docs-corpus");
const docsRoutePrefix = trimSlashes("docs");
const visibility = "public";

const docsBaseUrl = normalizeBaseUrl("http://charge-st-docs.s3-website.il-central-1.amazonaws.com");

function trimSlashes(s) {
  return s.replace(/^\/+|\/+$/g, "");
}

function normalizeBaseUrl(url) {
  return url.replace(/\/+$/, "");
}

/** intro.md -> docs/intro ; tutorial-basics/foo.md -> docs/tutorial-basics/foo */
function corpusRelPathToDocSlug(relPosix) {
  const withoutExt = relPosix.replace(/\.md$/i, "");
  return `${docsRoutePrefix}/${withoutExt}`;
}

function buildSourceUrl(docSlug) {
  return `${docsBaseUrl}/${docSlug}`;
}

function bedrockMetadata({ sourceUrl, docPath, visibility, corpusPath }) {
  return {
    metadataAttributes: {
      source_url: {
        value: {
          type: "STRING",
          stringValue: sourceUrl,
        },
      },
      doc_path: {
        value: {
          type: "STRING",
          stringValue: docPath,
        },
      },
      visibility: {
        value: {
          type: "STRING",
          stringValue: visibility,
        },
      },
      corpus_path: {
        value: {
          type: "STRING",
          stringValue: corpusPath,
        },
      },
    },
  };
}

function walkMarkdownFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkMarkdownFiles(full));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      out.push(full);
    }
  }
  return out;
}

function main() {
  if (!fs.existsSync(corpusDir)) {
    console.error(`Corpus dir not found: ${corpusDir}`);
    process.exit(1);
  }

  const mdFiles = walkMarkdownFiles(corpusDir);
  let written = 0;
  let skipped = 0;

  for (const mdPath of mdFiles) {
    const rel = path.relative(corpusDir, mdPath).split(path.sep).join("/");
    const docSlug = corpusRelPathToDocSlug(rel);
    const sourceUrl = buildSourceUrl(docSlug);
    const metaPath = `${mdPath}.metadata.json`;

    const payload = bedrockMetadata({
      sourceUrl,
      docPath: docSlug,
      visibility,
      corpusPath: rel,
    });

    const json = JSON.stringify(payload, null, 2) + "\n";

    if (dryRun) {
      console.log(`would write ${path.relative(repoRoot, metaPath)}`);
      console.log(`  source_url: ${sourceUrl}`);
    } else {
      fs.writeFileSync(metaPath, json, "utf8");
      console.log(`write ${path.relative(repoRoot, metaPath)}`);
    }
    written++;
  }

  console.log(
    `\nDone. ${written} metadata file(s)${dryRun ? " (dry-run)" : ""}, ${skipped} skipped.`
  );
  console.log(`DOCS_BASE_URL=${docsBaseUrl}`);
  console.log(`VISIBILITY=${visibility}`);
}

main();