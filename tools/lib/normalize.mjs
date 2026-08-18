/** Fold fullwidth punctuation / odd whitespace the corpus mixes in. */
export function normalizeText(s) {
  return s
    .replace(/\bDigimon gers\b/g, "Digimon gets") // OCR/print typo "gers" -> "gets" (BT18-002)
    .replace(/，/g, ",") // fullwidth comma ，
    .replace(/、/g, ",") // ideographic comma 、
    .replace(/．/g, ".") // fullwidth full stop ．
    .replace(/’/g, "'") // curly apostrophe '
    .replace(/[""]/g, '"') // curly double quotes " " -> straight " (nested-effect wrappers)
    .replace(/<([A-Za-z][^<>]{0,40})>/g, "＜$1＞") // ASCII keyword brackets -> fullwidth (BT16+ sets)
    .replace(/―|—|–/g, " - ") // dashes ―—–
    .replace(/&#160;|&nbsp;/g, " ") // HTML nbsp entities seen in the corpus
    .replace(/[・･]/g, " ‖ ") // fullwidth bullet ・ used as a list marker -> sentinel
    .replace(/ /g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/DigivoLv\.e/gi, "Digivolve");
}

/** Normalize a ＜keyword＞ inner string: trim, collapse spaces, A.->Attack. */
export function normalizeKeywordInner(s) {
  return s
    .replace(/\s+/g, " ")
    .replace(/\bSecurity A\./gi, "Security Attack") // "Security A. +1" (no trailing \b: '.'+' ' is not a boundary)
    .replace(/\bS Attack\b/gi, "Security Attack") // "S Attack +1" abbreviation
    .replace(/\bDe-?DigivoLv\.e\b/gi, "De-Digivolve")
    .replace(/\bIceclad\b/gi, "Ice Clad")
    .trim();
}
