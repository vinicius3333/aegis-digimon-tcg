// Printed keyword abilities and their parameterized references.

/**
 * The ~45 base keyword abilities (＜...＞) after normalizing spacing and the
 * `A.` -> `Attack` abbreviation. Numeric-parameterized keywords (Draw N,
 * De-Digivolve N, Security Attack ±N, Recovery +N, ...) carry their value in
 * the `Keyword` object's `amount`, so the enum itself stays small.
 */
export type Keyword =
  | "Blocker"
  | "Piercing"
  | "Rush"
  | "Raid"
  | "Reboot"
  | "Jamming"
  | "Retaliation"
  | "Barrier"
  | "Evade"
  | "Save"
  | "Delay"
  | "Alliance"
  | "Fortitude"
  | "Blitz"
  | "Collision"
  | "Vortex"
  | "Decoy"
  | "Scapegoat"
  | "Execute"
  | "Progress"
  | "IceClad"
  | "Training"
  | "Armor Purge"
  | "Mind Link"
  | "Ascension"
  | "BlastDigivolve"
  | "BlastDNADigivolve"
  | "Draw" // amount
  | "SecurityAttack" // amount (signed)
  | "DeDigivolve" // amount
  | "Recovery" // amount (Deck)
  | "DigiBurst" // amount
  | "Digisorption" // amount (signed)
  | "MaterialSave" // amount
  | "Link" // amount
  | "LinkMax"
  | "Fragment" // amount
  | "Partition"
  | "Decode"
  | "Overclock"
  | "UseReq"
  // EX-12 keyword: at the end of your turn, this Digimon may attack
  | "Engage"
  /**
   * PROVISIONAL — ＜Detach (trait)＞ (BT26-010/-019/-028/-037/-051/-063/-084). Zero occurrences
   * in the KB rules corpus (`node tools/kb/query.mjs rules "Detach"` and a grep of
   * `data/kb/rules/*.md` both come back empty) and zero occurrences in the source
   * documented behavior behavioral reference — the keyword is new to BT26 and unpublished as far as our sources go. Printed
   * text gives ONLY the trait restriction via the parenthetical note (CR §4-22-5's "notes"
   * convention, the same one that lets ＜Alliance (trait)＞ restrict which Digimon may be
   * suspended); every one of the 7 cards shows the bare tag with NO accompanying benefit or
   * timing text anywhere on the card. See `apps/api/src/engine/effects/detach.ts` for the
   * eligibility predicate this keyword's trait parameter drives, and the doc comment there for
   * the full reading and open questions. Not compiled by any card — no wave-2 card is implemented
   * against this entry; it exists so the shape is on record for when the KB refreshes.
   */
  | "Detach";

/** A keyword reference: the base keyword plus an optional numeric parameter. */
export interface KeywordRef {
  keyword: Keyword;
  /** Numeric param for parameterized keywords (Draw N, Security Attack ±N, ...). */
  amount?: number;
  /** Original ＜...＞ text, kept for keywords whose parenthetical param we do not model yet. */
  raw?: string;
  /**
   * Trait tokens from a keyword's parenthetical note (CR §4-22-5), e.g. ＜Detach ([Seven Code]
   * trait)＞ => ["Seven Code"]. Generic across any trait-parameterized keyword, not Detach-only —
   * see `apps/api/src/engine/effects/detach.ts` for the one current consumer.
   */
  traitFilter?: string[];
}
