import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-057 Grademon (Black/Yellow Lv.5 Ultimate, Vaccine, [Warrior]/[X Antibody]/[Chronicle],
// play cost 7, DP 7000, printed EvoCosts Black Lv.4 for 4 and Yellow Lv.4 for 4).
//
// Printed clauses:
//   [Digivolve] [Raptordramon]/Lv.4 w/[Chronicle] trait: Cost 3
//   [On Play] [When Digivolving] Until your opponent's turn ends, 1 of your [X Antibody] or
//     [Chronicle] trait Digimon gains ＜Reboot＞ and ＜Blocker＞. If during an attack, it also
//     isn't affected by their Digimon effects and gets +5000 DP.
//   [End of Attack] [Once Per Turn] This Digimon may digivolve into a Digimon card with the
//     [Chronicle] trait in the hand or trash.
//   Inherited: [All Turns] [Once Per Turn] When any of your [Chronicle] trait Digimon would
//     leave the battle area, by trashing your top security card, they don't leave.
// No security effect is printed.
//
// KB: `node tools/kb/query.mjs card EX13-057` reports no card-specific KB entries in the current
// local index (EX13 is pre-release). General rules consulted:
//   - §16-11 ＜Reboot＞ and §16-5 ＜Blocker＞: both are persistent effects, so a timed grant is
//     an ordinary `GainKeyword` with a duration rather than a one-shot action.
//   - §15-7 Optional Processing Conditions: "by <cost>, they don't leave" only performs the
//     replacement when the controller chooses the cost AND can pay it, so an empty security
//     stack never opens the window.
//   - §15-16-15-1 [End of Attack]: the window binds to the HOST's own attack unless the card
//     opts out, and this clause prints no [Counter] tag, so the default own-attack binding is
//     the printed reading.
//   - §3-4-5-8: breeding-area cards can't be referenced, so the grant filter pins
//     `zone: "battleArea"`.
//
// The header is BT20-053's verbatim, so it compiles the same way: TWO alternate requirements at
// cost 3 — the exact printed name [Raptordramon], and the COLORLESS "Lv.4 w/[Chronicle] trait"
// (no color is printed, so a red/black BT20-012 Ginryumon reaches this card for 3).
//
// The grant clause is BT20-053's "Then, if during an attack until the end of your opponent's
// turn, 1 of your Digimon isn't affected by your opponent's Digimon's effects and gets +5000 DP"
// with two keywords bolted on the front, so it reuses that card's encoding exactly:
//   * one prompt picks the recipient ("1 of your [X Antibody] or [Chronicle] trait Digimon"),
//     and every later action on the same Digimon carries `sameTarget: true` so the sentence's
//     "it" is the SAME permanent rather than a fresh prompt (CAP-A9 / BT19-089);
//   * "Until your opponent's turn ends" is `untilOpponentTurnEnd` on all four grants — the rider
//     shares the sentence's single duration;
//   * "If during an attack" is `condition: { kind: "duringAttack" }`, the gate BT20-053 and
//     BT20-056 both use for this exact printed phrase. It reads the resolving trigger payload,
//     so the rider lands only when this [On Play]/[When Digivolving] resolves inside an open
//     attack (e.g. digivolving off EX13-055's [When Attacking] clause);
//   * "isn't affected by their Digimon effects" is `GrantImmunity` with
//     `immuneFrom: "opponentDigimonEffects"` — "their" is the opponent, and the printed scope is
//     Digimon-sourced effects only, so an opposing OPTION still reaches the Digimon.
// The two trait tokens share ONE `nameOrTrait` reference: `tokens` is an OR-list, while two
// references would demand a Digimon carrying BOTH traits.
const OWN_X_OR_CHRONICLE: Filter = {
  controller: "mine",
  kind: ["Digimon"],
  zone: "battleArea",
  nameOrTrait: [{ tokens: ["X Antibody", "Chronicle"], match: "trait" }],
};

const grantRebootAndBlocker = (): Action[] => [
  {
    kind: "GainKeyword",
    target: { filter: OWN_X_OR_CHRONICLE, count: 1 },
    keyword: { keyword: "Reboot", raw: "＜Reboot＞" },
    duration: "untilOpponentTurnEnd",
    raw: "Until your opponent's turn ends, 1 of your [X Antibody] or [Chronicle] trait Digimon gains ＜Reboot＞",
  },
  {
    kind: "GainKeyword",
    target: { filter: OWN_X_OR_CHRONICLE, count: 1, sameTarget: true },
    keyword: { keyword: "Blocker", raw: "＜Blocker＞" },
    duration: "untilOpponentTurnEnd",
    raw: "and ＜Blocker＞",
  },
  {
    kind: "GrantImmunity",
    target: { filter: OWN_X_OR_CHRONICLE, count: 1, sameTarget: true },
    immuneFrom: "opponentDigimonEffects",
    duration: "untilOpponentTurnEnd",
    condition: { kind: "duringAttack", raw: "during an attack" },
    raw: "If during an attack, it also isn't affected by their Digimon effects",
  },
  {
    kind: "ModifyDP",
    target: { filter: OWN_X_OR_CHRONICLE, count: 1, sameTarget: true },
    amount: 5000,
    duration: "untilOpponentTurnEnd",
    condition: { kind: "duringAttack", raw: "during an attack" },
    raw: "and gets +5000 DP",
  },
];

// "This Digimon may digivolve into a Digimon card with the [Chronicle] trait in the hand or
// trash" — BT16-071's clause with a trait filter, identical to EX13-055's copy of the same
// sentence. `payCost: true` because no waiver or reduction is printed; `optional: true` is the
// printed "may"; the printed [Once Per Turn] is the effect-level `frequency`.
const digivolveIntoChronicle = (): Action => ({
  kind: "Digivolve",
  target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
  into: {
    controllerDefault: "mine",
    kind: ["Digimon"],
    nameOrTrait: [{ tokens: ["Chronicle"], match: "trait" }],
  },
  from: ["hand", "trash"],
  payCost: true,
  optional: true,
  raw: "This Digimon may digivolve into a Digimon card with the [Chronicle] trait in the hand or trash",
});

// Inherited: EX13-051's replacement shape with a trait-gated board filter and a security cost.
//   - the watched set is a BOARD filter ("any of your [Chronicle] trait Digimon"), NOT
//     `isSelfRef`, so the host saves its allies as well as itself. No "other" is printed, so
//     there is deliberately no `excludeSelf`.
//   - no cause qualifier is printed ("would leave the battle area", full stop), so the watcher
//     omits `leaveCause` entirely: battle, a rule, an opponent's effect and the controller's OWN
//     effect all reach it. Compare EX13-051 / BT20-056, which print "other than by your effects"
//     and therefore carry `leaveCause: "otherThanYourEffect"`.
//   - "they don't leave" is plural, so `affectsAll: true` with `count: "all"` saves every
//     matching Digimon named in the same leave (EX12-072, EX13-043, KB Q4319).
//   - "by trashing your top security card" is the `trashSecurityTop` cost (BT20-056 prints the
//     same cost on its own inherited replacement), and `optional: true` is §15-7's free choice.
const CHRONICLE_DIGIMON: Filter = {
  controller: "mine",
  kind: ["Digimon"],
  nameOrTrait: [{ tokens: ["Chronicle"], match: "trait" }],
};

const chronicleDontLeave = (): Action => ({
  kind: "Replacement",
  event: "wouldLeavePlay",
  mode: "prevent",
  optional: true,
  affectsAll: true,
  sourceFilter: CHRONICLE_DIGIMON,
  target: { filter: CHRONICLE_DIGIMON, count: "all" },
  cost: { kind: "trashSecurityTop", raw: "by trashing your top security card" },
  raw: "When any of your [Chronicle] trait Digimon would leave the battle area, by trashing your top security card, they don't leave",
});

export const compiled: CompiledCard = {
  cardId: "EX13-057",
  effects: [
    { trigger: "OnPlay", actions: grantRebootAndBlocker() },
    { trigger: "WhenDigivolving", actions: grantRebootAndBlocker() },
    { trigger: "EndOfAttack", frequency: "OncePerTurn", actions: [digivolveIntoChronicle()] },
    {
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [chronicleDontLeave()],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { namesExact: ["Raptordramon"], cost: 3, isAlternate: true },
    { level: 4, traits: ["Chronicle"], cost: 3, isAlternate: true },
  ],
};

registerIrCard("EX13-057", compiled);
