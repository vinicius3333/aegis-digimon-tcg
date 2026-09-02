// Printed keyword abilities and their parameterized references.

/**
 * The ~45 base keyword abilities (＜...＞) after normalizing spacing and the `A.` -> `Attack`
 * abbreviation. Numeric-parameterized keywords carry their value in `KeywordRef.amount`, so this
 * union stays small.
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
  | "SecurityAttack" // signed amount
  | "DeDigivolve" // amount
  | "Recovery" // amount
  | "DigiBurst" // amount
  | "Digisorption" // signed amount
  | "MaterialSave" // amount
  | "DigiXrosSubstitute" // allows one otherwise-ineligible DigiXros material
  | "Link" // amount
  | "LinkMax"
  | "Fragment" // amount
  | "Partition"
  | "Decode"
  | "Overclock"
  | "UseReq"
  | "Engage" // EX-12: at the end of your turn, this Digimon may attack
  /**
   * PROVISIONAL — ＜Detach (trait)＞ (BT26-010/-019/-028/-037/-051/-063/-084). The keyword is new
   * to BT26 and appears nowhere in our sources: zero hits in the KB rules corpus and zero in the
   * behavioral reference. Printed text gives ONLY the trait restriction, via the CR §4-22-5
   * parenthetical-note convention that also lets ＜Alliance (trait)＞ restrict which Digimon may be
   * suspended; all 7 cards show the bare tag with no benefit or timing text.
   *
   * No card compiles against this entry — it exists so the shape is on record for when the KB
   * refreshes. See `apps/api/src/engine/effects/detach.ts` for the eligibility predicate its trait
   * parameter drives and the open questions.
   */
  | "Detach";

/** A keyword reference: the base keyword plus an optional numeric parameter. */
export interface KeywordRef {
  keyword: Keyword;
  amount?: number;
  /** Original ＜...＞ text, kept for keywords whose parenthetical param is not modeled yet. */
  raw?: string;
  /**
   * Trait tokens from a keyword's parenthetical note (CR §4-22-5): ＜Detach ([Seven Code] trait)＞
   * => ["Seven Code"]. Generic across any trait-parameterized keyword; `detach.ts` is the one
   * current consumer.
   */
  traitFilter?: string[];
}
