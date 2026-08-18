#!/usr/bin/env node
// Download the rules PDFs (Comprehensive Rules, Official Rule Manual, Glossary),
// extract their text, and build a chunked, searchable index for the prose KB.
//
// Per-card data (errata/Q&A/banlist) is an exact lookup; the rules are the only
// part that needs topic search, so this is where chunking happens. Search itself
// (BM25) lives in query.mjs over the chunks produced here.
//
// Text extraction uses `pdftotext` (poppler). Install with: brew install poppler
//
// Usage: node tools/kb/index-rules.mjs [--force]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { fetchBinary } from "./lib/http.mjs";
import { writeJson, updateManifest } from "./lib/manifest.mjs";
import { RAW_DIR, RULES_DIR, RULES_INDEX_PATH, SOURCES } from "./lib/paths.mjs";

const force = process.argv.includes("--force");
const OCR_SWIFT = path.join(path.dirname(fileURLToPath(import.meta.url)), "lib/ocr.swift");
const OCR_DPI = "300";
const CHUNK_TARGET_WORDS = 220;
// Comprehensive rules are numbered with hyphens: "1-3-7. When a rule or effect..."
const RULE_RE = /^(\d+(?:-\d+)*)\.\s*(.*)$/;
// Glossary sections are marked with a leading ■ / ● / 【 glyph.
const MARK_RE = /^[■●▼◆【]\s*(.+)$/;

function log(message) {
  process.stdout.write(`${message}\n`);
}

function ensurePdftotext() {
  try {
    execFileSync("pdftotext", ["-v"], { stdio: "ignore" });
  } catch {
    throw new Error(
      "pdftotext not found. Install poppler first: brew install poppler (macOS) " +
        "or apt-get install poppler-utils (Debian/Ubuntu).",
    );
  }
}

function extractText(pdfPath) {
  // -raw follows the content stream, which preserves correct reading order for
  // the two-column rules layout (default mode reads across both columns).
  const out = execFileSync(
    "pdftotext",
    ["-raw", "-nopgbrk", "-enc", "UTF-8", pdfPath, "-"],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  return out.replace(/\r\n?/g, "\n").trim();
}

function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function hasCommand(cmd, args = ["-v"]) {
  try {
    execFileSync(cmd, args, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// OCR an image-only PDF (no text layer): render pages, then read each with the
// macOS Vision framework (preferred) or Tesseract. Result is cached as text and
// the large rendered PNGs are discarded. Returns "" if no OCR backend exists.
function ocrImagePdf(pdfPath, sourceId) {
  const cacheFile = path.join(RAW_DIR, "ocr", `${sourceId}.txt`);
  if (!force && fs.existsSync(cacheFile)) return fs.readFileSync(cacheFile, "utf8");

  const swift = hasCommand("swift", ["--version"]);
  const tesseract = hasCommand("tesseract", ["--version"]);
  if (!hasCommand("pdftoppm", ["-v"]) || (!swift && !tesseract)) return "";

  const pageDir = path.join(RAW_DIR, "ocr", sourceId);
  fs.rmSync(pageDir, { recursive: true, force: true });
  fs.mkdirSync(pageDir, { recursive: true });
  execFileSync("pdftoppm", ["-png", "-r", OCR_DPI, pdfPath, path.join(pageDir, "page")]);
  const pages = fs.readdirSync(pageDir).filter((f) => f.endsWith(".png")).sort()
    .map((f) => path.join(pageDir, f));

  let text;
  if (swift) {
    text = execFileSync("swift", [OCR_SWIFT, ...pages], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  } else {
    text = pages
      .map((p) => execFileSync("tesseract", [p, "-"], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }))
      .join("\n\n");
  }

  text = cleanOcrText(text);
  fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
  fs.writeFileSync(cacheFile, text);
  fs.rmSync(pageDir, { recursive: true, force: true });
  return text;
}

// Drop lines that are pure numbers/symbols or short shouty fragments — these are
// OCR of embedded card/diagram images, not rule prose.
function cleanOcrText(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => {
      if (!/[a-zA-Z]/.test(line)) return false;
      const letters = line.replace(/[^a-zA-Z]/g, "");
      const lowers = line.replace(/[^a-z]/g, "");
      const words = line.split(/\s+/).length;
      if (words <= 3 && lowers.length / letters.length < 0.2) return false;
      return true;
    })
    .join("\n");
}

// Re-flow wrapped lines into numbered "units" (one per rule or heading). A unit
// starts at a line beginning with a section number; subsequent lines are its
// continuation. Standalone page numbers are dropped.
function buildUnits(text) {
  const units = [];
  let current = null;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || /^\d+$/.test(line)) continue;
    const ruleMatch = line.match(RULE_RE);
    const markMatch = line.match(MARK_RE);
    if (ruleMatch) {
      if (current) units.push(current);
      current = { num: ruleMatch[1], depth: ruleMatch[1].split("-").length, text: ruleMatch[2] };
    } else if (markMatch) {
      if (current) units.push(current);
      // A ■ marker is a pure section label; following lines start a fresh unit.
      units.push({ num: null, depth: 1, text: markMatch[1], marked: true });
      current = null;
    } else if (current) {
      current.text += ` ${line}`;
    } else {
      current = { num: null, depth: 0, text: line };
    }
  }
  if (current) units.push(current);
  return units;
}

function isHeading(unit) {
  if (unit.marked) return true;
  return (
    unit.num !== null &&
    unit.depth <= 3 &&
    wordCount(unit.text) <= 6 &&
    !/[.)]$/.test(unit.text)
  );
}

function splitByWords(text, target) {
  const words = text.split(/\s+/).filter(Boolean);
  const slices = [];
  for (let i = 0; i < words.length; i += target) {
    slices.push(words.slice(i, i + target).join(" "));
  }
  return slices;
}

// Group units into ~CHUNK_TARGET_WORDS chunks. Section headings start a fresh
// chunk and set the title/section carried by following chunks. Numbered headings
// stay in the text as content; ■ glossary markers are pure labels. A unit longer
// than the target (e.g. a whole glossary section) is split by word count, merged
// with any pending buffer so no orphan fragments are emitted.
function chunkUnits(units, source) {
  const chunks = [];
  let title = source.title;
  let section = null;
  let chunkSection = null;
  let buffer = [];
  let words = 0;

  const emit = (lines, sec) => {
    const body = lines.join("\n").trim();
    if (!body) return;
    chunks.push({
      id: `${source.id}-${String(chunks.length).padStart(4, "0")}`,
      source: source.id,
      sourceTitle: source.title,
      section: sec ?? section,
      title,
      text: body,
    });
  };

  const flush = () => {
    if (buffer.length === 0) return;
    emit(buffer, chunkSection);
    buffer = [];
    words = 0;
    chunkSection = null;
  };

  for (const unit of units) {
    if (isHeading(unit)) {
      flush();
      title = unit.text;
      section = unit.num;
      if (unit.marked) continue; // pure label, captured by `title`
    }
    const line = unit.num ? `${unit.num}. ${unit.text}` : unit.text;

    if (wordCount(line) > CHUNK_TARGET_WORDS) {
      const combined = [...buffer, line].join(" ");
      buffer = [];
      words = 0;
      chunkSection = null;
      for (const slice of splitByWords(combined, CHUNK_TARGET_WORDS)) {
        emit([slice], unit.num ?? section);
      }
      continue;
    }

    if (chunkSection === null) chunkSection = unit.num ?? section;
    buffer.push(line);
    words += wordCount(line);
    if (words >= CHUNK_TARGET_WORDS) flush();
  }
  flush();
  return chunks;
}

async function main() {
  ensurePdftotext();
  fs.mkdirSync(RULES_DIR, { recursive: true });

  const allChunks = [];
  for (const source of SOURCES.rulesPdfs) {
    const pdfPath = path.join(RAW_DIR, "pdf", `${source.id}.pdf`);
    const { cached } = await fetchBinary(source.url, { cacheFile: pdfPath, force });
    let text = extractText(pdfPath);
    let via = cached ? "cache" : "fetched";
    if (wordCount(text) === 0) {
      text = ocrImagePdf(pdfPath, source.id);
      via = "OCR";
      if (wordCount(text) === 0) {
        log(`rules: ${source.id} — warn: no text layer and no OCR backend available; skipped`);
        continue;
      }
    }
    fs.writeFileSync(path.join(RULES_DIR, `${source.id}.md`), `# ${source.title}\n\n${text}\n`);

    const chunks = chunkUnits(buildUnits(text), source);
    allChunks.push(...chunks);
    log(`rules: ${source.id} (${via}) — ${wordCount(text)} words, ${chunks.length} chunks`);
  }

  if (allChunks.length === 0) throw new Error("no rule chunks produced — extraction may have failed");
  writeJson(RULES_INDEX_PATH, { sources: SOURCES.rulesPdfs, chunks: allChunks });
  updateManifest("rules", {
    sources: SOURCES.rulesPdfs.map((s) => s.url),
    chunks: allChunks.length,
  });
  log(`rules: ${allChunks.length} chunks -> ${path.relative(process.cwd(), RULES_INDEX_PATH)}`);
}

main().catch((err) => {
  process.stderr.write(`error: ${err.message}\n`);
  process.exit(1);
});
