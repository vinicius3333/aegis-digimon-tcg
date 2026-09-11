import type { Action, CardEffect, CompiledCard, Condition, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-036 Kentaurosmon (Yellow Lv.6 Mega, Vaccine, [Holy Warrior]/[Royal Knight]/[DATA SQUAD],
// 12000 DP, play cost 12, printed EvoCost Yellow Lv.5 for 3).
//
// Printed clauses:
//   [Digivolve] Lv.5 w/[Holy Beast]/[DATA SQUAD] trait: Cost 3
//   [Assembly -5] Lv.5 × Lv.4 × Lv.3, all Yellow w/[Holy Beast] trait
//   [Security] [On Play] 1 of your opponent's Digimon gets -7000 DP for the turn. If there are 6
//     or fewer total cards in both players' security stacks, instead all of their Digimon get
//     -7000 DP for the turn.
//   [When Digivolving] By trashing the top security card of 1 player with the most security cards,
//     you may activate 1 of this Digimon's [Security] effects.
//   [When Digivolving] [End of Attack] [Counter] [Once Per Turn] You may place 1 of each player's
//     Digimon as the top security cards.
// No inherited effect is printed, and the [Security] clause is printed inside `effectText` rather
// than in the separate `securityEffectText` field, so the Security CardEffect below carries an
// explicit `description` for decision and log provenance.
//
// KB: `node tools/kb/query.mjs card EX13-036` reports no entries — EX13 is pre-release. General
// rules consulted in `data/kb/rules/comprehensive.md`:
//   - §7-3 / §7-3-2 Assembly: materials come from the TRASH only, the exact printed slot count
//     must be placed, the reduction is the flat printed -5, and §7-3-2-6 puts the leftmost listed
//     material (the Lv.5) closest to the played card.
//   - §11-3 Counter Timing: a [Counter] effect is activated by the DEFENDING seat inside the open
//     counter window, which is why the third copy of the placement body carries
//     `trigger: "Counter"` (prior art in this same set: EX13-015).
//   - §15-16-15-1 [End of Attack]: the window binds to the host's OWN attack unless a card opts
//     out. The printed [Counter] tag is what covers the opponent's attack here, so the
//     `EndOfAttack` copy deliberately keeps the default own-attack binding instead of
//     `attackScope: "any"`.
//   - §3-4-5-8: breeding-area cards can't be referenced, so every board filter pins
//     `zone: "battleArea"`.

// "1 of your opponent's Digimon" / "all of their Digimon" — the same pool, read from the seat that
// owns the resolving card, so the [Security] copy aims at the ATTACKER's board.
const theirDigimon: Filter = { controller: "opponent", kind: ["Digimon"], zone: "battleArea" };

// "If there are 6 or fewer total cards in both players' security stacks" — `totalSecurityCount`
// sums BOTH stacks (unlike `zoneCount`, which reads one seat). The two branches are written as
// complementary comparisons rather than a `not` wrapper, matching BT4-103's identical
// "X. If <gate>, instead Y." shape: exactly one of them can ever hold.
const crowdedSecurity: Condition = {
  kind: "totalSecurityCount",
  op: "gte",
  value: 7,
  raw: "there are 7 or more total cards in both players' security stacks",
};
const thinSecurity: Condition = {
  kind: "totalSecurityCount",
  op: "lte",
  value: 6,
  raw: "there are 6 or fewer total cards in both players' security stacks",
};

// The shared [Security] / [On Play] body. "instead" replaces the single target with every one of
// their Digimon, so the two ModifyDP actions are mutually exclusive — never both.
const dpDrop = (): Action[] => [
  {
    kind: "ModifyDP",
    target: { filter: theirDigimon, count: 1 },
    amount: -7000,
    duration: "forTheTurn",
    condition: crowdedSecurity,
    raw: "1 of your opponent's Digimon gets -7000 DP for the turn",
  },
  {
    kind: "ModifyDP",
    target: { filter: theirDigimon, count: "all" },
    amount: -7000,
    duration: "forTheTurn",
    condition: thinSecurity,
    raw: "all of their Digimon get -7000 DP for the turn",
  },
];

// "You may place 1 of each player's Digimon as the top security cards."
//
// Two placements, one per player. `ownerSecurity: true` sends each placed card to ITS OWNER's
// stack rather than to the resolving player's single stack (LM-020's "on top of its owner's
// security stack"), which is what "the top security cardS" — plural, one per player — means.
//
// The single printed "You may" governs the whole bundle, so only the FIRST placement is optional
// and it carries `abortOnDecline`: declining skips the opponent half too (runEffect stops at an
// aborting leading action). Ordering the controller's own half first is safe rather than
// arbitrary — this Digimon is itself one of its controller's battle-area Digimon, so that half
// always has a candidate and the prompt is always reachable.
const placeOneEach = (): Action[] => [
  {
    kind: "SecurityManipulation",
    op: "placeAsSecurity",
    controller: "mine",
    source: { filter: { controller: "mine", kind: ["Digimon"], zone: "battleArea" }, count: 1 },
    ownerSecurity: true,
    toTop: true,
    optional: true,
    abortOnDecline: true,
    raw: "you may place 1 of your Digimon as the top security card",
  },
  {
    kind: "SecurityManipulation",
    op: "placeAsSecurity",
    controller: "opponent",
    source: { filter: theirDigimon, count: 1 },
    ownerSecurity: true,
    toTop: true,
    raw: "place 1 of your opponent's Digimon as the top security card",
  },
];

// One printed [Once Per Turn] covers all three placement timings, so all three share one per-turn
// ledger key (EX13-015, EX13-023, EX12-024).
const PLACEMENT_USE_KEY = "EX13-036/place-one-each-as-security";

const placementEffect = (trigger: "WhenDigivolving" | "EndOfAttack" | "Counter"): CardEffect => ({
  trigger,
  frequency: "OncePerTurn",
  sharedUseKey: PLACEMENT_USE_KEY,
  actions: placeOneEach(),
});

export const compiled: CompiledCard = {
  effects: [
    // [Security] — fired by a normal security check while this card sits in its owner's stack.
    {
      trigger: "Security",
      isSecurity: true,
      description:
        "[Security] 1 of your opponent's Digimon gets -7000 DP for the turn. If there are 6 or fewer total cards in both players' security stacks, instead all of their Digimon get -7000 DP for the turn.",
      actions: dpDrop(),
    },
    // [On Play] — the same body from the printed twin timing.
    { trigger: "OnPlay", actions: dpDrop() },
    // "[When Digivolving] By trashing the top security card of 1 player with the most security
    // cards, you may activate 1 of this Digimon's [Security] effects."
    //
    // `RecoverByTrashingMostSecurity` with `recover: false` is exactly the printed cost and
    // nothing more: a player is eligible when they hold >= 1 security card AND >= the other
    // player's count, a tie leaves BOTH eligible for the controller to choose between, and the
    // whole prompt is declinable (the printed "you may"). It records whether anything was
    // actually trashed on `ctx.lastEffectActed`, which `ifThisEffectActed` then reads — the
    // BT26-031 / ST23-05 shape for the same printed sentence.
    //
    // `ReactivateEffect { fromTrigger: "Security" }` re-runs this card's own compiled [Security]
    // CardEffect with this permanent as the source, so the "6 or fewer total" branch is decided
    // AFTER the cost trashed a card — which is the printed resolution order, and the whole reason
    // the clause is worth paying at 7 total security.
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "RecoverByTrashingMostSecurity",
          recover: false,
          raw: "by trashing the top security card of 1 player with the most security cards",
        },
        {
          kind: "ReactivateEffect",
          fromTrigger: "Security",
          count: 1,
          condition: { kind: "ifThisEffectActed", raw: "a security card was trashed" },
          raw: "you may activate 1 of this Digimon's [Security] effects",
        },
      ],
    },
    placementEffect("WhenDigivolving"),
    placementEffect("EndOfAttack"),
    placementEffect("Counter"),
  ],
  coverage: "full",
  residual: [],
  // "Lv.5 w/[Holy Beast]/[DATA SQUAD] trait: Cost 3" carries no color, so it is strictly wider
  // than the printed Yellow Lv.5 EvoCost: a PURPLE Lv.5 [Holy Beast] or a BLUE/BLACK Lv.5
  // [DATA SQUAD] Digimon reaches this card for 3. `traits` is EXACT trait equality over
  // forms ∪ attributes ∪ types — the "w/[X] trait" wording — and the array is a disjunction, so
  // a near-miss trait such as [Mysterious Beast] is refused.
  digivolutionRequirement: [{ level: 5, traits: ["Holy Beast", "DATA SQUAD"], cost: 3, isAlternate: true }],
  // "Lv.5 × Lv.4 × Lv.3, all Yellow w/[Holy Beast] trait": three single-card slots in printed
  // order, each level-pinned, all sharing the Yellow color requirement and the EXACT [Holy Beast]
  // trait ("w/... trait", so `traits` rather than a substring `names`).
  assemblyRequirement: [
    {
      reduceCost: 5,
      materials: [
        { level: 5, colors: ["Yellow"], traits: ["Holy Beast"], count: 1 },
        { level: 4, colors: ["Yellow"], traits: ["Holy Beast"], count: 1 },
        { level: 3, colors: ["Yellow"], traits: ["Holy Beast"], count: 1 },
      ],
    },
  ],
};

registerIrCard("EX13-036", compiled);
