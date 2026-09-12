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
  /** CR §16-45: optional self-deletion protects other Digimon from opposing effects. */
  | "Guard"
  /** CR §16-46: optional specified-link payment prevents departure other than by own effects. */
  | "Detach"
  /** CR §16-47: gain all effects except Succession from the topmost specified stack card. */
  | "Succession";

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
