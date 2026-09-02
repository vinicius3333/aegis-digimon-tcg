import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX10-034 Blastmon
// Q5101: gained attack effects still exist on unaffected Digimon, but only
// trigger if that Digimon can resolve effects. Q5102 requires exactly two
// digivolution cards; Q5103 watches attacks by either player.
//
// Audit fixes (EX10 card-by-card):
//  - the gained "[Start of Your Main Phase] This Digimon attacks" carried `{ kind: "Attack" }`
//    with no subject. `runCombatAction` returns immediately when `attacker ?? subject ?? target`
//    is undefined, so the granted effect fired and did nothing. The subject is the granted
//    permanent, which is the watcher's own source — the persisted record's `isSelfRef` target.
//  - the two [On Play]/[When Digivolving] windows were produced by `.map` over a string array,
//    which widened `trigger` to `string` and lost `CardEffect` checking for their whole body.
//  - duration `"untilOwnerTurnEnd"` is not an `EffectDurationRef`. `toDuration` falls through to
//    `UntilEachTurnEnd`, so a buff taken on the OPPONENT's turn (this is an [All Turns] watcher,
//    Q5103) expired at that turn's end instead of lasting to the end of the controller's turn.
//    The printed "until your turn ends" is `untilYourTurnEnd` (UntilOwnerTurnEnd).
//  - the "by trashing any 2 ..." processing condition is declinable (CR 15-7-4), so the action
//    is `optional` + `abortOnDecline`. Q5102 still forbids paying with only 1 card, which the
//    exact `count: 2` (no `upTo`) enforces.
//  - `digivolutionRequirement` rows are the printed EvoCost rows, not alternate routes:
//    `isAlternate: false`.
//  - DigiXros: `count` is the PER-MATERIAL discount and `maxMaterials` is the printed material
//    count (EX3-014, EX12-015). `costReduction` is read only for a `count: "∞"` recipe, so it was
//    inert, and with a single slot and no `maxMaterials` the play path caps materials at "every
//    candidate" — any number of [Bagra Army] cards could be placed for -2 each.

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        { keyword: "Collision", raw: "＜Collision＞" },
        { keyword: "Fragment", amount: 3, raw: "＜Fragment (3)＞" },
        { keyword: "Blocker", raw: "＜Blocker＞" },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "GainTriggeredEffect",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          gainedTrigger: "StartOfYourMainPhase",
          gainedActions: [{ kind: "Attack", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } }],
          duration: "untilOpponentTurnEnd",
          raw: 'Until your opponent\'s turn ends, give 1 of their Digimon "[Start of Your Main Phase] This Digimon attacks."',
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "GainTriggeredEffect",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          gainedTrigger: "StartOfYourMainPhase",
          gainedActions: [{ kind: "Attack", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } }],
          duration: "untilOpponentTurnEnd",
          raw: 'Until your opponent\'s turn ends, give 1 of their Digimon "[Start of Your Main Phase] This Digimon attacks."',
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttacking",
          sourceFilter: { controller: "any", kind: ["Digimon"] },
          actions: [
            {
              kind: "GainKeyword",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              keyword: { keyword: "SecurityAttack", amount: 1, raw: "＜Security A. +1＞" },
              duration: "untilYourTurnEnd",
              cost: {
                kind: "trash",
                target: { filter: { isSelfRef: true, zone: "digivolutionCards" }, count: 2 },
                raw: "By trashing any 2 of this Digimon's digivolution cards",
              },
              optional: true,
              abortOnDecline: true,
            },
            {
              kind: "ModifyDP",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              amount: 3000,
              duration: "untilYourTurnEnd",
              condition: { kind: "ifThisEffectActed", raw: "if you did" },
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { level: 5, colors: ["Black"], cost: 5, isAlternate: false },
    { level: 5, colors: ["Purple"], cost: 5, isAlternate: false },
  ],
  digiXrosRequirement: [{ materials: [{ traits: ["Bagra Army"] }], count: 2, maxMaterials: 2 }],
};

registerIrCard("EX10-034", compiled);
export { compiled };
export default compiled;
