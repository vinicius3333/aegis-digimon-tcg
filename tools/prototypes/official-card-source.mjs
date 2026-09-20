#!/usr/bin/env node

/**
 * PROTOTYPE: compare one committed card with Bandai's official Japanese and
 * English card-list pages. This intentionally performs no writes.
 *
 * Usage: pnpm poc:official-card -- BT24-021
 */

import { readFile } from "node:fs/promises";

const cardId = process.argv
  .slice(2)
  .find((argument) => argument !== "--")
  ?.toUpperCase();
if (!cardId) throw new Error("Usage: pnpm poc:official-card -- <CARD-ID>");

const sources = {
  japanese: `https://digimoncard.com/cards/?card_no=${encodeURIComponent(cardId)}&search=true`,
  english: `https://world.digimoncard.com/cards/?card_no=${encodeURIComponent(cardId)}&search=true`,
};

function decodeHtml(value) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function extractCardBlock(html) {
  const startNeedle = `<div class="popupCol" id="${cardId}">`;
  const start = html.indexOf(startNeedle);
  if (start < 0) throw new Error(`${cardId} was not found in the official response`);
  const next = html.indexOf('<div class="popupCol" id="', start + startNeedle.length);
  return html.slice(start, next < 0 ? undefined : next);
}

function extractTitle(block) {
  const match = block.match(/<div class="cardTitle">([\s\S]*?)<\/div>/i);
  return match ? decodeHtml(match[1]) : undefined;
}

function extractTextFields(block) {
  const fields = [];
  const pattern = /<dt class="cardInfoTitSmall">([\s\S]*?)<\/dt>\s*<dd class="cardInfoData">([\s\S]*?)<\/dd>/gi;
  for (const match of block.matchAll(pattern)) {
    fields.push({ label: decodeHtml(match[1]), text: decodeHtml(match[2]) });
  }
  return fields;
}

async function fetchOfficial(url) {
  const response = await fetch(url, { headers: { "user-agent": "aegis-official-card-source-poc/1.0" } });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  const block = extractCardBlock(await response.text());
  return { name: extractTitle(block), fields: extractTextFields(block) };
}

function englishText(card) {
  return {
    effectText: card.effectText,
    inheritedEffectText: card.inheritedEffectText,
    securityEffectText: card.securityEffectText,
    linkEffect: card.linkEffect,
  };
}

function officialEnglishText(fields) {
  const value = (label) => fields.find((field) => field.label === label)?.text;
  const upper = [value("[Special Digivolution Condition]"), value("[Effect]")].filter(Boolean).join("\n\n");
  return {
    effectText: upper || undefined,
    inheritedEffectText: value("[Inherited Effect]"),
    securityEffectText: value("[Security Effect]"),
    linkEffect: value("[Link Effect]"),
  };
}

function comparable(value) {
  return value
    ?.replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const cards = JSON.parse(
  await readFile(new URL("../../packages/shared/src/cards/data/cards.json", import.meta.url), "utf8"),
);
const local = cards.find((card) => card.cardId === cardId);
if (!local) throw new Error(`${cardId} is not present in cards.json`);

const [japanese, english] = await Promise.all([fetchOfficial(sources.japanese), fetchOfficial(sources.english)]);
const localText = englishText(local);
const officialText = officialEnglishText(english.fields);
const mismatches = Object.keys(localText).filter(
  (field) => comparable(localText[field]) !== comparable(officialText[field]),
);

console.log(
  JSON.stringify(
    {
      prototype: true,
      cardId,
      localName: local.nameEn,
      officialNames: { japanese: japanese.name, english: english.name },
      sources,
      japaneseText: japanese.fields,
      comparison: Object.fromEntries(
        Object.keys(localText).map((field) => [
          field,
          {
            matches: comparable(localText[field]) === comparable(officialText[field]),
            local: localText[field],
            official: officialText[field],
          },
        ]),
      ),
      verdict: mismatches.length === 0 ? "MATCH" : "MISMATCH",
      mismatches,
    },
    null,
    2,
  ),
);

process.exitCode = mismatches.length === 0 ? 0 : 1;
