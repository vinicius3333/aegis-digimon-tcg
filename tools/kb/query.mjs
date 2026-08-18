#!/usr/bin/env node
// Query the knowledge base. This is the interface the migration (and humans) use.
//
//   node tools/kb/query.mjs card EX4-072        # exact: errata + Q&A + banlist
//   node tools/kb/query.mjs rules "delete timing"# BM25 search over rule prose
//   ... add --json for machine-readable output, --limit N for rules hits.

import { readJson } from "./lib/manifest.mjs";
import { loadCardIndex } from "./lib/cards.mjs";
import { bm25Search, snippet } from "./lib/bm25.mjs";
import {
  ERRATA_PATH,
  QA_PATH,
  BANLIST_PATH,
  RULES_INDEX_PATH,
} from "./lib/paths.mjs";

const args = process.argv.slice(2);
const command = args[0];
const json = args.includes("--json");
const limitArg = args.indexOf("--limit");
const limit = limitArg !== -1 ? Number(args[limitArg + 1]) : 5;

function out(value) {
  process.stdout.write(typeof value === "string" ? `${value}\n` : `${JSON.stringify(value, null, 2)}\n`);
}

// The migration may pass ids in the source's SET_ID form; resolve to the
// canonical cards.json cardId (SET-ID) so lookups don't silently miss.
function resolveCardId(raw, cardIndex) {
  for (const variant of [raw, raw.replace(/_/g, "-")]) {
    if (cardIndex.has(variant)) return variant;
  }
  return raw;
}

function cardLookup(rawCardId) {
  const errata = readJson(ERRATA_PATH, {}) ?? {};
  const qa = readJson(QA_PATH, {}) ?? {};
  const banlist = readJson(BANLIST_PATH, { current: {} }) ?? { current: {} };
  const cardIndex = loadCardIndex();
  const cardId = resolveCardId(rawCardId, cardIndex);

  return {
    cardId,
    name: cardIndex.get(cardId)?.nameEn ?? null,
    banlist: banlist.current?.[cardId] ?? null,
    errata: errata[cardId] ?? null,
    qa: qa[cardId] ?? [],
  };
}

function printCard(result) {
  const lines = [];
  lines.push(`${result.cardId}${result.name ? ` ${result.name}` : ""}`);

  if (result.banlist) {
    const { status, count, effectiveDate } = result.banlist;
    const label =
      status === "restricted" ? `RESTRICTED to ${count} cop${count === 1 ? "y" : "ies"}` : status.toUpperCase();
    lines.push(`  Banlist: ${label}${effectiveDate ? ` (since ${effectiveDate})` : ""}`);
  }

  if (result.errata) {
    lines.push(`  Errata (${result.errata.date ?? "n/a"}):`);
    for (const change of result.errata.changes) {
      if (change.before) lines.push(`    before: ${change.before.replace(/\n/g, " ")}`);
      if (change.after) lines.push(`    after:  ${change.after.replace(/\n/g, " ")}`);
    }
    if (result.errata.notes) lines.push(`    notes:  ${result.errata.notes.replace(/\n/g, " ")}`);
  }

  if (result.qa.length > 0) {
    lines.push(`  Q&A (${result.qa.length}):`);
    for (const entry of result.qa) {
      lines.push(`    ${entry.qno} (${entry.date ?? "n/a"}): ${entry.question}`);
      lines.push(`      A: ${entry.answer.replace(/\n/g, " ")}`);
      if (entry.related.length) lines.push(`      related: ${entry.related.join(", ")}`);
    }
  }

  if (!result.banlist && !result.errata && result.qa.length === 0) {
    lines.push("  (no knowledge-base entries)");
  }
  out(lines.join("\n"));
}

function rulesSearch(query) {
  const index = readJson(RULES_INDEX_PATH, { chunks: [] }) ?? { chunks: [] };
  const hits = bm25Search(query, index.chunks, { limit });
  return hits.map((hit) => ({
    id: hit.doc.id,
    source: hit.doc.source,
    section: hit.doc.section,
    title: hit.doc.title,
    score: Number(hit.score.toFixed(3)),
    text: hit.doc.text,
    snippet: snippet(hit.doc.text, query),
  }));
}

function printRules(query, hits) {
  if (hits.length === 0) {
    out(`No rule chunks matched: ${query}`);
    return;
  }
  const lines = [];
  for (const hit of hits) {
    const ref = `[${hit.source}${hit.section ? ` §${hit.section}` : ""}] ${hit.title}`;
    lines.push(`${ref}  (${hit.score})`);
    lines.push(`  ${hit.snippet}`);
    lines.push("");
  }
  out(lines.join("\n").trimEnd());
}

function main() {
  if (command === "card") {
    const cardId = args[1];
    if (!cardId) return usage();
    const result = cardLookup(cardId);
    return json ? out(result) : printCard(result);
  }
  if (command === "rules") {
    const query = args.slice(1).filter((a) => !a.startsWith("--") && a !== String(limit)).join(" ");
    if (!query) return usage();
    const hits = rulesSearch(query);
    return json ? out(hits) : printRules(query, hits);
  }
  return usage();
}

function usage() {
  out("usage:");
  out('  node tools/kb/query.mjs card <CARD_ID> [--json]');
  out('  node tools/kb/query.mjs rules "<query>" [--limit N] [--json]');
  process.exit(command ? 1 : 0);
}

main();
