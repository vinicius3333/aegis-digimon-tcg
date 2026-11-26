#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkConformanceCitations } from "./check-conformance-citations.mjs";
import { CARDS_PATH, ERRATA_PATH, KB_DIR, QA_PATH, ROOT, RULES_INDEX_PATH } from "./lib/paths.mjs";

export const RULINGS_DATA_DIRECTORY = path.join(ROOT, "apps/web/src/game/rulings/data");
const EFFECT_ORDER_FILE = "effect-order.json";
const SETS_DIRECTORY = "sets";
const DERIVED_TRIGGERING_SECTION = "15-4-5";
const GLUED_FOOTNOTE = /\b([A-Za-z]{2,}[a-z])\d{1,3}(?=[\s.,;:)"]|$)/g;
const LINK_TARGET_AFTER_REFERENCE = /"\)\d+(?:-\d+)*-?(?=\s|$)/g;
const SPLIT_REFERENCE = /(refer to \d+(?:-\d+)*-) (\d+)/g;
const BROKEN_HYPHENATION = /\b([A-Za-z]+)- ([a-z]+)\b/g;
const IGNORED_QA_CHARACTERS = /[[\]【】"“”'‘’]/g;
const OBLIGATIONS_PATH = path.join(KB_DIR, "rule-obligations.json");
const CARD_TESTS_DIRECTORY = path.join(ROOT, "apps/api/src/cards");
const KEYWORD_SECTION = /^16-\d+$/;
const KEYWORD_TITLE = /^<(.+)>$/;
const KEYWORD_TOKEN = /<([^<>]+)>/g;

function fingerprint(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function normalizeKeywordBrackets(text) {
  return text.replace(/[＜〈‹]|&lang;/g, "<").replace(/[＞〉›]|&rang;/g, ">");
}

export function findKeywordTokens(text) {
  return [...normalizeKeywordBrackets(text).matchAll(KEYWORD_TOKEN)].map((match) => match[1].trim());
}

export function isKeywordToken({ token, keyword }) {
  if (token === keyword || token.startsWith(`${keyword} `) || token.startsWith(`${keyword}(`)) {
    return true;
  }
  return keyword.endsWith("+") && token.startsWith(keyword);
}

export function cleanRuleText(text) {
  return text
    .replace(SPLIT_REFERENCE, "$1$2")
    .replace(LINK_TARGET_AFTER_REFERENCE, '")')
    .replace(GLUED_FOOTNOTE, "$1")
    .replace(BROKEN_HYPHENATION, "$1-$2");
}

function normalizeQaText(text) {
  return text.toLowerCase().replace(IGNORED_QA_CHARACTERS, "").replace(/\s+/g, " ").trim();
}

export function mergeDuplicateQa(entries) {
  const merged = [];
  const byText = new Map();
  for (const entry of entries) {
    const key = `${normalizeQaText(entry.question)}\u0000${normalizeQaText(entry.answer)}`;
    const existing = byText.get(key);
    if (existing === undefined) {
      const kept = { ...entry, ids: [entry.id] };
      byText.set(key, kept);
      merged.push(kept);
    } else {
      existing.ids.push(entry.id);
    }
  }
  return merged.map(({ ids, ...entry }) => (ids.length > 1 ? { ...entry, ids } : entry));
}

function buildSection(chunk) {
  return {
    section: chunk.section,
    title: chunk.title,
    sourceTitle: chunk.sourceTitle,
    text: chunk.source === "comprehensive" ? cleanRuleText(chunk.text) : chunk.text,
  };
}

function findKeywordChunks(rulesIndex) {
  return rulesIndex.chunks.flatMap((chunk) => {
    const keyword = KEYWORD_TITLE.exec(chunk.title ?? "")?.[1];
    return chunk.source === "comprehensive" && KEYWORD_SECTION.test(chunk.section ?? "") && keyword
      ? [{ keyword, chunk }]
      : [];
  });
}

function findEffectOrderChunkIds(obligations) {
  return [
    ...new Set(
      obligations.obligations
        .filter(
          (obligation) =>
            obligation.kind === "rule" && obligation.branch === "ordering" && obligation.status === "proven",
        )
        .map((obligation) => obligation.source.chunkId),
    ),
  ];
}

function findCitedChunkIdsByCard({ citations, chunks, cardIds }) {
  const citedByCard = new Map();
  for (const call of citations) {
    const relative = path.relative(CARD_TESTS_DIRECTORY, call.file);
    const cardId = path.basename(call.file, ".test.ts");
    const chunk = chunks.get(call.id);
    if (relative.startsWith("..") || !cardIds.has(cardId) || chunk === undefined) {
      continue;
    }
    if (call.fingerprint !== fingerprint(chunk.text)) {
      continue;
    }
    citedByCard.set(cardId, new Set([...(citedByCard.get(cardId) ?? []), call.id]));
  }
  return citedByCard;
}

export function buildRulingsSnapshot({ cards, errata, qa, rulesIndex, obligations, citations }) {
  const chunks = new Map(rulesIndex.chunks.map((chunk) => [chunk.id, chunk]));
  const cardIds = new Set(cards.map((card) => card.cardId));
  const keywordChunks = findKeywordChunks(rulesIndex);
  const citedByCard = findCitedChunkIdsByCard({ citations, chunks, cardIds });
  const derivedTriggering = rulesIndex.chunks.filter(
    (chunk) => chunk.source === "comprehensive" && chunk.section === DERIVED_TRIGGERING_SECTION,
  );
  const effectOrderSections = [
    ...new Set([
      ...findEffectOrderChunkIds(obligations).filter((id) => chunks.has(id)),
      ...derivedTriggering.map((chunk) => chunk.id),
    ]),
  ].sort();
  const usedSectionIds = new Set(effectOrderSections);
  const cardEntries = [];
  for (const card of cards) {
    const tokens = findKeywordTokens(`${card.effectText ?? ""}\n${card.inheritedEffectText ?? ""}`);
    const keywordSectionIds = keywordChunks
      .filter(({ keyword }) => tokens.some((token) => isKeywordToken({ token, keyword })))
      .map(({ chunk }) => chunk.id);
    const sections = [...new Set([...keywordSectionIds, ...(citedByCard.get(card.cardId) ?? [])])].sort();
    const cardErrata = errata[card.cardId];
    const cardQa = qa[card.cardId] ?? [];
    if (cardErrata === undefined && cardQa.length === 0 && sections.length === 0) {
      continue;
    }
    for (const id of sections) {
      usedSectionIds.add(id);
    }
    cardEntries.push([
      card.cardId,
      {
        ...(cardErrata === undefined
          ? {}
          : {
              errata: {
                date: cardErrata.date ?? null,
                changes: cardErrata.changes.map(({ before, after }) => ({
                  before: before ?? null,
                  after: after ?? null,
                })),
                notes: cardErrata.notes ?? null,
              },
            }),
        ...(cardQa.length === 0
          ? {}
          : {
              qa: mergeDuplicateQa(
                cardQa.map(({ qno, question, answer, date }) => ({ id: qno, date: date ?? null, question, answer })),
              ),
            }),
        ...(sections.length === 0 ? {} : { sections }),
      },
    ]);
  }
  return {
    effectOrderSections,
    sections: Object.fromEntries([...usedSectionIds].sort().map((id) => [id, buildSection(chunks.get(id))])),
    cards: Object.fromEntries(cardEntries),
  };
}

function getCardSet(cardId) {
  return /^([A-Za-z]+\d*)-/.exec(cardId)?.[1] ?? "other";
}

export function splitRulingsSnapshot(snapshot) {
  const pick = (ids) => Object.fromEntries([...ids].sort().map((id) => [id, snapshot.sections[id]]));
  const bySet = new Map();
  for (const [cardId, entry] of Object.entries(snapshot.cards)) {
    const set = getCardSet(cardId);
    bySet.set(set, [...(bySet.get(set) ?? []), [cardId, entry]]);
  }
  return new Map([
    [
      EFFECT_ORDER_FILE,
      { effectOrderSections: snapshot.effectOrderSections, sections: pick(snapshot.effectOrderSections) },
    ],
    ...[...bySet.entries()].map(([set, cards]) => [
      `${SETS_DIRECTORY}/${set}.json`,
      { cards: Object.fromEntries(cards), sections: pick(new Set(cards.flatMap(([, entry]) => entry.sections ?? []))) },
    ]),
  ]);
}

function listDataFiles() {
  if (!existsSync(RULINGS_DATA_DIRECTORY)) {
    return [];
  }
  const sets = path.join(RULINGS_DATA_DIRECTORY, SETS_DIRECTORY);
  return [
    ...readdirSync(RULINGS_DATA_DIRECTORY).filter((name) => name.endsWith(".json")),
    ...(existsSync(sets) ? readdirSync(sets).map((name) => `${SETS_DIRECTORY}/${name}`) : []),
  ].sort();
}

function readJsonFile(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function main() {
  const isCheck = process.argv.includes("--check");
  const snapshot = buildRulingsSnapshot({
    cards: readJsonFile(CARDS_PATH),
    errata: readJsonFile(ERRATA_PATH),
    qa: readJsonFile(QA_PATH),
    rulesIndex: readJsonFile(RULES_INDEX_PATH),
    obligations: readJsonFile(OBLIGATIONS_PATH),
    citations: checkConformanceCitations({ root: ROOT }).calls,
  });
  const files = [...splitRulingsSnapshot(snapshot)].map(([name, content]) => [name, `${JSON.stringify(content)}\n`]);
  const summary = `${Object.keys(snapshot.cards).length} cards, ${Object.keys(snapshot.sections).length} rule sections, ${files.length} files`;
  if (isCheck) {
    const expected = files.map(([name]) => name).sort();
    const stale =
      JSON.stringify(listDataFiles()) !== JSON.stringify(expected) ||
      files.some(([name, serialized]) => readFileSync(path.join(RULINGS_DATA_DIRECTORY, name), "utf8") !== serialized);
    if (stale) {
      process.stderr.write(
        `rulings data is stale: run node tools/kb/build-rulings-snapshot.mjs (${RULINGS_DATA_DIRECTORY})\n`,
      );
      process.exitCode = 1;
      return;
    }
    process.stdout.write(`rulings data is current: ${summary}\n`);
    return;
  }
  rmSync(RULINGS_DATA_DIRECTORY, { recursive: true, force: true });
  mkdirSync(path.join(RULINGS_DATA_DIRECTORY, SETS_DIRECTORY), { recursive: true });
  for (const [name, serialized] of files) {
    writeFileSync(path.join(RULINGS_DATA_DIRECTORY, name), serialized);
  }
  process.stdout.write(`rulings data written: ${summary} -> ${RULINGS_DATA_DIRECTORY}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
