#!/usr/bin/env node
// Read-only check against the official PDF and committed extracted/indexed text.
// Run explicitly: node tools/kb/check-rules-freshness.mjs

import fs from "node:fs";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { fetchBinary, fetchText } from "./lib/http.mjs";
import { BASE_URL, RULES_DIR, RULES_INDEX_PATH } from "./lib/paths.mjs";
import { buildUnits, chunkUnits } from "./index-rules.mjs";
import path from "node:path";

const RULES_PAGE = `${BASE_URL}/rule/`;
const SOURCE = { id: "comprehensive", title: "Comprehensive Rules" };
const CHAPTER_TITLES = [
  "Game Overview",
  "Card Information",
  "Game Areas",
  "Basic Game Terminology",
  "Game Preparation",
  "Game Procedures",
  "Playing a Card",
  "Digivolution",
  "Using Cards",
  "Link",
  "Attacking",
  "Blocking",
  "Security Checks",
  "Battles",
  "Effect Rules",
  "Keyword Effects",
];
const MONTHS = {
  Jan: "01",
  Feb: "02",
  Mar: "03",
  Apr: "04",
  May: "05",
  Jun: "06",
  Jul: "07",
  Aug: "08",
  Sep: "09",
  Oct: "10",
  Nov: "11",
  Dec: "12",
};

export function parsePublishedComprehensive(html) {
  const links = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  const matches = links.filter(([, href]) => /(?:^|\/)general_rule\.pdf(?:\?|$)/.test(href));
  if (matches.length !== 1) throw new Error(`Expected one comprehensive-rules download; found ${matches.length}`);
  const [, href, markup] = matches[0];
  if (!/Comprehensive Rules Manual/i.test(markup)) throw new Error("Comprehensive-rules download label changed");
  const date = markup.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.\s*(\d{1,2}),\s*(\d{4})\b/i);
  if (!date) throw new Error("Comprehensive-rules publication date not found");
  const month = MONTHS[date[1][0].toUpperCase() + date[1].slice(1).toLowerCase()];
  const publishedDate = `${date[3]}-${month}-${date[2].padStart(2, "0")}`;
  const url = new URL(href, RULES_PAGE).href;
  if (new URL(url).origin !== BASE_URL) throw new Error("Unexpected comprehensive-rules download origin");
  return { publishedDate, url };
}

export function parseCommittedComprehensive(markdown) {
  const header = markdown.slice(0, 400);
  const version = header.match(/\bVer\.\s*(\d+\.\d+)\b/i);
  const date = header.match(/\bLast Updated:\s*(\d{4})\/(\d{2})\/(\d{2})\b/i);
  if (!version || !date) throw new Error("Committed comprehensive-rules header lacks version or update date");
  return { version: version[1], updatedDate: `${date[1]}-${date[2]}-${date[3]}` };
}

function extractedText(markdown) {
  const prefix = "# Comprehensive Rules\n\n";
  if (!markdown.startsWith(prefix)) throw new Error("Committed comprehensive-rules Markdown prefix changed");
  return markdown.slice(prefix.length).replace(/\r\n?/g, "\n").trim();
}

export function extractPdfText(buffer) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "aegis-rules-freshness-"));
  const pdfPath = path.join(directory, "rules.pdf");
  try {
    fs.writeFileSync(pdfPath, buffer);
    return execFileSync("pdftotext", ["-raw", "-nopgbrk", "-enc", "UTF-8", pdfPath, "-"], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    })
      .replace(/\r\n?/g, "\n")
      .trim();
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

function normalizedExtractedChunk(chunk) {
  const chapter = CHAPTER_TITLES.indexOf(chunk.title) + 1;
  const artifactSection = String(chapter + 18);
  if (chapter > 0 && chunk.section === artifactSection && chunk.text.startsWith(`${artifactSection}. ${chunk.title}`)) {
    return {
      ...chunk,
      section: String(chapter),
      text: chunk.text.replace(`${artifactSection}. ${chunk.title}`, `${chapter}. ${chunk.title}`),
    };
  }
  return chunk;
}

export function indexMatchesText(index, text) {
  const actual = index.chunks?.filter((chunk) => chunk.source === SOURCE.id);
  if (!Array.isArray(actual)) throw new Error("Comprehensive-rules index is missing chunks");
  const expected = chunkUnits(buildUnits(text), SOURCE).map(normalizedExtractedChunk);
  const signature = (chunk) => JSON.stringify([chunk.section, chunk.title, chunk.text]);
  return JSON.stringify(actual.map(signature).sort()) === JSON.stringify(expected.map(signature).sort());
}

export function compareFreshness(published, officialText, markdown, index) {
  const official = parseCommittedComprehensive(officialText);
  const committed = parseCommittedComprehensive(markdown);
  const indexedHeader = index.chunks?.find((chunk) => chunk.id === "comprehensive-0000")?.text;
  if (typeof indexedHeader !== "string") throw new Error("Indexed comprehensive-rules header missing");
  const indexed = parseCommittedComprehensive(indexedHeader);
  if (official.updatedDate !== published.publishedDate) {
    throw new Error("Official downloads page date disagrees with PDF header");
  }
  const contentMatches = officialText === extractedText(markdown);
  const indexMatches = indexMatchesText(index, extractedText(markdown));
  const status =
    published.publishedDate === committed.updatedDate &&
    official.version === committed.version &&
    indexed.updatedDate === committed.updatedDate &&
    indexed.version === committed.version &&
    contentMatches &&
    indexMatches
      ? "current"
      : "stale";
  return {
    status,
    publishedDate: published.publishedDate,
    url: published.url,
    officialVersion: official.version,
    committedVersion: committed.version,
    committedDate: committed.updatedDate,
    indexedVersion: indexed.version,
    indexedDate: indexed.updatedDate,
    contentMatches,
    indexMatches,
  };
}

export async function checkFreshness({
  fetchPage = () => fetchText(RULES_PAGE),
  fetchPdf = (url) => fetchBinary(url),
  pdfToText = extractPdfText,
  readLocal = () => fs.readFileSync(path.join(RULES_DIR, "comprehensive.md"), "utf8"),
  readIndex = () => JSON.parse(fs.readFileSync(RULES_INDEX_PATH, "utf8")),
} = {}) {
  const [{ text: html }, markdown, index] = await Promise.all([fetchPage(), readLocal(), readIndex()]);
  const published = parsePublishedComprehensive(html);
  const { buffer } = await fetchPdf(published.url);
  const officialText = pdfToText(buffer);
  return compareFreshness(published, officialText, markdown, index);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await checkFreshness();
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (result.status !== "current") process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`Rules freshness check failed: ${error.message}\n`);
    process.exitCode = 2;
  }
}
