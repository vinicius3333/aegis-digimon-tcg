/* The reminder text for each keyword the rules glossary explains
   (data/kb/rules/glossary.md), for the field badges and the card details. A keyword
   the glossary does not cover points at the card's own effect text instead. */

import type { Translate, TranslationKey } from "../i18n";

const REMINDER_KEYS: Readonly<Record<string, TranslationKey>> = {
  Blocker: "redesign.arena.keyword.Blocker",
  SecurityAttack: "redesign.arena.keyword.SecurityAttack",
  Recovery: "redesign.arena.keyword.Recovery",
  Piercing: "redesign.arena.keyword.Piercing",
  Draw: "redesign.arena.keyword.Draw",
  Jamming: "redesign.arena.keyword.Jamming",
  Digisorption: "redesign.arena.keyword.Digisorption",
  Reboot: "redesign.arena.keyword.Reboot",
  DeDigivolve: "redesign.arena.keyword.DeDigivolve",
  Retaliation: "redesign.arena.keyword.Retaliation",
  DigiBurst: "redesign.arena.keyword.DigiBurst",
  Rush: "redesign.arena.keyword.Rush",
  Blitz: "redesign.arena.keyword.Blitz",
  Delay: "redesign.arena.keyword.Delay",
  Decoy: "redesign.arena.keyword.Decoy",
  ArmorPurge: "redesign.arena.keyword.ArmorPurge",
  Engage: "redesign.arena.keyword.Engage",
};

/** Card data writes keywords in full-width brackets (＜Blocker＞); the UI prints ASCII ones. */
export function normalizeKeywordBrackets(text: string): string {
  return text.replace(/＜/g, "<").replace(/＞/g, ">");
}

/**
 * The keyword's name as the glossary keys it: "Armor Purge", "De-Digivolve 1" and
 * "Security A. +1" all reduce to the bare compact name.
 */
export function keywordBaseName(keyword: string): string {
  return normalizeKeywordBrackets(keyword)
    .replace(/[<>]/g, "")
    .replace(/\bA\.(?=\s|$)/, "Attack")
    .replace(/\(.*\)/, "")
    .replace(/[+-]?\d+/g, "")
    .replace(/[\s-]/g, "");
}

/**
 * How the glossary explains a keyword. A Security Attack is explained with the
 * modifier the permanent carries, or else the one its printed text names.
 */
export function keywordReminder(keyword: string, t: Translate, securityAttackModifier?: number): string {
  const name = keywordBaseName(keyword);
  const modifier = securityAttackModifier || Number(/[+-]\d+/.exec(keyword)?.[0] ?? 0);
  if (name === "SecurityAttack" && modifier) {
    return t(modifier > 0 ? "redesign.arena.keyword.SecurityAttackUp" : "redesign.arena.keyword.SecurityAttackDown", {
      count: Math.abs(modifier),
    });
  }
  const key = REMINDER_KEYS[name];
  return key ? t(key) : t("redesign.arena.keyword.unlisted");
}
