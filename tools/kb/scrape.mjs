#!/usr/bin/env node
// Scrape + normalize the Digimon TCG knowledge base from world.digimoncard.com.
//
// Usage:
//   node tools/kb/scrape.mjs errata          # /rule/errata_card/  -> errata.json
//   node tools/kb/scrape.mjs banlist         # /rule/restriction_card/ -> banlist.json
//   node tools/kb/scrape.mjs qa [--limit N]  # /rule/?card_no=... -> qa.json (resumable)
//   node tools/kb/scrape.mjs all             # errata + banlist + qa
//   ... add --force to bypass the on-disk raw cache.
//
// Rules PDFs are handled separately by tools/kb/index-rules.mjs (Phase 3).

import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fetchText } from "./lib/http.mjs";
import { loadCardIds, loadCardIndex } from "./lib/cards.mjs";
import { updateManifest, writeJson, readJson } from "./lib/manifest.mjs";
import { parseErrata } from "./lib/parse-errata.mjs";
import { parseBanlist } from "./lib/parse-banlist.mjs";
import { parseQa, emptyQaPage } from "./lib/parse-qa.mjs";
import {
  RAW_DIR,
  ERRATA_PATH,
  BANLIST_PATH,
  QA_PATH,
  SOURCES,
} from "./lib/paths.mjs";

const args = process.argv.slice(2);
const command = args[0];
const force = args.includes("--force");
const limitArg = args.indexOf("--limit");
const limit = limitArg !== -1 ? Number(args[limitArg + 1]) : Infinity;
const startArg = args.indexOf("--start");
const start = startArg !== -1 ? Number(args[startArg + 1]) : 0;
const outputArg = args.indexOf("--output");
const qaOutput = outputArg !== -1 ? path.resolve(args[outputArg + 1]) : QA_PATH;
const noManifest = args.includes("--no-manifest");

function log(message) {
  process.stdout.write(`${message}\n`);
}

function warnUnknownCards(label, cardIds) {
  const known = new Set(loadCardIndex().keys());
  const unknown = cardIds.filter((id) => !known.has(id));
  if (unknown.length > 0) {
    log(`  warn: ${label} has ${unknown.length} cardId(s) not in cards.json: ${unknown.join(", ")}`);
  }
}

async function scrapeErrata() {
  const cacheFile = path.join(RAW_DIR, "errata_card.html");
  const { text, cached } = await fetchText(SOURCES.errata, { cacheFile, force });
  const errata = parseErrata(text);
  const count = Object.keys(errata).length;
  if (count === 0) throw new Error("errata parse produced 0 entries — markup may have changed");
  if (!errata["EX4-072"]) log("  warn: expected sample EX4-072 not found in errata");
  warnUnknownCards("errata", Object.keys(errata));
  writeJson(ERRATA_PATH, errata);
  updateManifest("errata", { url: SOURCES.errata, count, cached });
  log(`errata: ${count} cards ${cached ? "(cache)" : "(fetched)"} -> ${rel(ERRATA_PATH)}`);
}

async function scrapeBanlist() {
  const cacheFile = path.join(RAW_DIR, "restriction_card.html");
  const { text, cached } = await fetchText(SOURCES.banlist, { cacheFile, force });
  const banlist = parseBanlist(text);
  const currentCount = Object.keys(banlist.current).length;
  if (banlist.events.length === 0) {
    throw new Error("banlist parse produced 0 events — markup may have changed");
  }
  warnUnknownCards("banlist", Object.keys(banlist.current));
  writeJson(BANLIST_PATH, banlist);
  updateManifest("banlist", {
    url: SOURCES.banlist,
    events: banlist.events.length,
    current: currentCount,
    cached,
  });
  log(
    `banlist: ${banlist.events.length} events, ${currentCount} currently restricted ` +
      `${cached ? "(cache)" : "(fetched)"} -> ${rel(BANLIST_PATH)}`,
  );
}

async function scrapeQa() {
  const cardIds = loadCardIds().slice(start, start + limit);
  const qa = force ? {} : readJson(qaOutput, {}) ?? {};
  let withRulings = 0;
  let fetched = 0;
  let processed = 0;
  const failed = [];

  for (const cardId of cardIds) {
    const cacheFile = path.join(RAW_DIR, "qa", `${cardId}.html`);
    let result;
    try {
      result = await fetchText(SOURCES.qa(cardId), { cacheFile, force });
    } catch (err) {
      // A transient network failure on one card must not abort the whole crawl.
      // Leave it uncached so the next run retries it; pause briefly to recover.
      failed.push(cardId);
      log(`  qa: skip ${cardId} after fetch error (${err.message})`);
      await sleep(3000);
      processed++;
      continue;
    }
    if (!result.cached) fetched++;
    if (emptyQaPage(result.text)) {
      delete qa[cardId];
    } else {
      const rulings = parseQa(result.text, cardId);
      if (rulings.length > 0) {
        qa[cardId] = rulings;
        withRulings++;
      } else {
        delete qa[cardId];
      }
    }
    processed++;
    if (processed % 100 === 0) {
      log(`  qa: ${processed}/${cardIds.length} processed, ${fetched} fetched, ${failed.length} failed...`);
      writeJson(qaOutput, qa); // checkpoint
    }
  }

  writeJson(qaOutput, qa);
  if (!noManifest) {
    updateManifest("qa", {
      url: SOURCES.qa("<card_no>"),
      cardsScanned: cardIds.length,
      cardsWithRulings: Object.keys(qa).length,
      lastFetched: fetched,
      failed,
    });
  }
  log(
    `qa: scanned ${cardIds.length} cards, ${Object.keys(qa).length} have rulings ` +
      `(${withRulings} updated this run, ${fetched} fetched, ${failed.length} failed) -> ${rel(QA_PATH)}`,
  );
  if (failed.length > 0) {
    log(`  ${failed.length} cards failed to fetch — re-run 'qa' to retry them (cached cards are skipped).`);
  }
}

function rel(absolutePath) {
  return path.relative(process.cwd(), absolutePath);
}

async function main() {
  switch (command) {
    case "errata":
      await scrapeErrata();
      break;
    case "banlist":
      await scrapeBanlist();
      break;
    case "qa":
      await scrapeQa();
      break;
    case "all":
      await scrapeErrata();
      await scrapeBanlist();
      await scrapeQa();
      break;
    default:
      log("usage: node tools/kb/scrape.mjs <errata|banlist|qa|all> [--start N] [--limit N] [--output FILE] [--no-manifest] [--force]");
      process.exit(command ? 1 : 0);
  }
}

main().catch((err) => {
  process.stderr.write(`error: ${err.stack || err.message}\n`);
  process.exit(1);
});
