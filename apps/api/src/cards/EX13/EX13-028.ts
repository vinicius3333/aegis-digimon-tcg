import type { CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-028 Sukamon (Yellow, Lv.4 Champion [Abnormal], Virus, play cost 3, DP 2000).
// Printed EvoCosts are dual: Yellow Lv.3 for 2 and Black Lv.3 for 2 — both carried by the
// catalog, and the card prints no [Digivolve] header, so no `digivolutionRequirement` is needed.
//
// Printed clauses:
//   ＜Blocker＞
//   [On Deletion] Reveal the top 3 cards of your deck. You may play 1 play cost 3 or lower
//     Digimon card with [Chuumon] or [Sukamon] in its name among them without paying the cost.
//     trash the rest.
//   [Inherited] [All Turns] [Once Per Turn] When this Digimon would leave the battle area other
//     than by your effects, by deleting 1 other Digimon with [Sukamon] in its name, it doesn't
//     leave.
// No security effect is printed.
//
// No KB rulings exist for this card (EX13 is pre-release). General rules consulted:
//   - §16-36 ＜Blocker＞: read from printed text by `combat/keywords.ts`; the `Static` entry keeps
//     the IR record complete, the BT26-029 / EX13-020 / EX13-023 shape.
//   - §4-22-1 card names: "with [X] in its name" is the SUBSTRING reading, so PlatinumSukamon
//     qualifies for [Sukamon] and a card merely printing "[Sukamon]" in its TEXT does not.
//   - §8-8 "without paying the cost": the play is free, which is `to: "play"` with no `costDelta`.
//
// [On Deletion] is the BT3-063 / BT11-040 reveal shape — both are this card's own earlier
// printings of the same sentence. One `add` slot with `to: "play"` and `optional: true` for the
// printed "You may", and `rest: "trash"` for "trash the rest". The slot filter carries all three
// printed restrictions: `kind: ["Digimon"]` ("Digimon card"), `playCostLte: 3` ("play cost 3 or
// lower") and one substring name reference holding BOTH tokens, because `tokens` is an OR-list
// (two separate references would read as a conjunction).
//
// The inherited clause is verbatim EX13-027's, so it is encoded identically: a `wouldLeavePlay`
// Replacement in `mode: "prevent"` with `leaveCause: "otherThanYourEffect"` and
// `sourceFilter: { isSelfRef: true }` (AD1-003, EX12-003, EX13-015). The cost is the engine's
// generic `deleteOwn` "delete as a cost" primitive, which honours its target's `controller`.
// The clause says "1 other Digimon", NOT "1 of your other Digimon", so the cost target is
// `controller: "any"` — the reading already shipped on the three earlier cards printing this
// sentence (BT11-040, BT13-065, EX13-027); `excludeSelf: true` is the printed "other".
// The printed [Once Per Turn] is the effect's `frequency`: per the coordinator's EX13 notes an
// extra `oncePerTurnKey` on a leave Replacement is redundant, so it is left off.
const playableNamedDigimon: Filter = {
  controllerDefault: "mine",
  kind: ["Digimon"],
  playCostLte: 3,
  nameOrTrait: [{ tokens: ["Chuumon", "Sukamon"], match: "name" }],
};

export const compiled: CompiledCard = {
  cardId: "EX13-028",
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [{ filter: playableNamedDigimon, count: 1, to: "play", optional: true }],
          rest: "trash",
          raw: "Reveal the top 3 cards of your deck. You may play 1 play cost 3 or lower Digimon card with [Chuumon] or [Sukamon] in its name among them without paying the cost. trash the rest",
        },
      ],
    },
    {
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          leaveCause: "otherThanYourEffect",
          sourceFilter: { isSelfRef: true },
          actions: [],
          cost: {
            kind: "deleteOwn",
            target: {
              filter: {
                controller: "any",
                excludeSelf: true,
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Sukamon"], match: "name" }],
              },
              count: 1,
            },
            raw: "by deleting 1 other Digimon with [Sukamon] in its name",
          },
          raw: "When this Digimon would leave the battle area other than by your effects, by deleting 1 other Digimon with [Sukamon] in its name, it doesn't leave",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX13-028", compiled);
