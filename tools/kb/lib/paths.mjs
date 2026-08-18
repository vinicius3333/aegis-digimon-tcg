// Shared paths and constants for the rules/errata/Q&A knowledge base tooling.
// No deps; resolves everything relative to the repo root.

import path from "node:path";
import { fileURLToPath } from "node:url";

// lib -> kb -> tools -> repo root
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

export const CARDS_PATH = path.join(ROOT, "packages/shared/src/cards/data/cards.json");

export const KB_DIR = path.join(ROOT, "data/kb");
export const RAW_DIR = path.join(KB_DIR, "raw");
export const RULES_DIR = path.join(KB_DIR, "rules");

export const ERRATA_PATH = path.join(KB_DIR, "errata.json");
export const QA_PATH = path.join(KB_DIR, "qa.json");
export const BANLIST_PATH = path.join(KB_DIR, "banlist.json");
export const RULES_INDEX_PATH = path.join(KB_DIR, "rules-index.json");
export const MANIFEST_PATH = path.join(KB_DIR, "manifest.json");

export const BASE_URL = "https://world.digimoncard.com";

export const SOURCES = {
  errata: `${BASE_URL}/rule/errata_card/`,
  banlist: `${BASE_URL}/rule/restriction_card/`,
  qa: (cardNo) => `${BASE_URL}/rule/?card_no=${encodeURIComponent(cardNo)}`,
  rulesPdfs: [
    { id: "comprehensive", url: `${BASE_URL}/rule/pdf/general_rule.pdf`, title: "Comprehensive Rules" },
    { id: "manual", url: `${BASE_URL}/rule/pdf/manual.pdf`, title: "Official Rule Manual" },
    { id: "glossary", url: `${BASE_URL}/rule/pdf/glossary.pdf`, title: "Glossary" },
  ],
};

// Polite, identifiable UA. The site exposes no robots.txt; we still throttle.
export const USER_AGENT =
  "aegis-kb-research/0.1 (Digimon TCG migration tooling; contact vini@quave.com.br)";
