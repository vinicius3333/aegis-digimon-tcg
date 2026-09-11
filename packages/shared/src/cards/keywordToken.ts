// Delimiter-anchored matching for printed keyword tokens in "in its text" filters.

/**
 * The printed spellings of the keyword abilities, as they appear between ＜ and ＞ on a card.
 * Kept as printed text (not the IR `Keyword` union's identifiers) because this module reads
 * the catalog's English text, never the compiled IR.
 */
const PRINTED_KEYWORDS: ReadonlySet<string> = new Set(
  [
    "Blocker",
    "Piercing",
    "Rush",
    "Raid",
    "Reboot",
    "Jamming",
    "Retaliation",
    "Barrier",
    "Evade",
    "Save",
    "Delay",
    "Alliance",
    "Fortitude",
    "Blitz",
    "Collision",
    "Vortex",
    "Decoy",
    "Scapegoat",
    "Execute",
    "Progress",
    "Ice Clad",
    "Training",
    "Armor Purge",
    "Mind Link",
    "Ascension",
    "Blast Digivolve",
    "Blast DNA Digivolve",
    "Draw",
    "Security Attack",
    "De-Digivolve",
    "Recovery",
    "Digi-Burst",
    "Digisorption",
    "Material Save",
    "DigiXros Substitute",
    "Link",
    "Fragment",
    "Partition",
    "Decode",
    "Overclock",
    "Use Req.",
    "Engage",
    "Guard",
    "Detach",
  ].map((keyword) => keyword.toLowerCase()),
);

/** Whether a requirement token names a printed keyword rather than a card name or trait. */
export function isPrintedKeywordToken(token: string): boolean {
  return PRINTED_KEYWORDS.has(token.trim().toLowerCase());
}

const KEYWORD_OPENERS = ["＜", "<", "〈"];

/**
 * Whether `text` (already lowercased) prints the keyword `token` as a keyword — that is,
 * immediately after an opening bracket and followed by the closing bracket, a parameter or a
 * space. "＜Save＞" matches the token `Save`; "＜Material Save＞" and "[Savemon]" do not, which
 * is what separates a real ＜Save＞ card from a substring collision (EX10 seam 12). A keyword
 * printed only inside a parenthetical reminder note still reads as the keyword here; CR
 * §4-22-5 excludes reminder text, which no catalog card currently depends on.
 */
export function textPrintsKeyword(text: string, token: string): boolean {
  const needle = token.trim().toLowerCase();
  for (const opener of KEYWORD_OPENERS) {
    let index = text.indexOf(opener + needle);
    while (index >= 0) {
      const after = text[index + opener.length + needle.length];
      if (after === undefined || after === "＞" || after === ">" || after === "〉" || after === " " || after === "(") {
        return true;
      }
      index = text.indexOf(opener + needle, index + 1);
    }
  }
  return false;
}

/**
 * Match one "in its text" token against a card's text. Keyword tokens are delimiter-anchored;
 * everything else keeps plain substring semantics (a name or trait fragment).
 */
export function textMatchesToken(text: string, token: string): boolean {
  const needle = token.trim().toLowerCase();
  return isPrintedKeywordToken(needle) ? textPrintsKeyword(text, needle) : text.includes(needle);
}
