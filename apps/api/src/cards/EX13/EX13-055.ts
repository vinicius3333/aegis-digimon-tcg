import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-055 Raptordramon (Black/Yellow Lv.4 Champion, Vaccine, [Cyborg]/[X Antibody]/[Chronicle],
// play cost 5, DP 5000, printed EvoCosts Black Lv.3 for 3 and Yellow Lv.3 for 3).
//
// Printed clauses:
//   [Digivolve] [Dorumon]/Lv.3 w/[Chronicle] trait: Cost 2
//   [On Play] [When Digivolving] 1 of your opponent's Digimon gets -3000 DP for the turn.
//   [When Attacking] This Digimon may digivolve into a Digimon card with the [Chronicle] trait
//     in the hand or trash.
//   Inherited: ＜Barrier＞
// No security effect is printed.
//
// KB: `node tools/kb/query.mjs card EX13-055` reports no card-specific KB entries in the current
// local index (EX13 is pre-release). General rules consulted:
//   - §16-8 ＜Barrier＞: a persistent keyword read straight off printed text by
//     `combat/keywords.ts`. The `Static` entry exists only so the IR record covers the printed
//     clause, the way EX13-051 and EX12-060 carry theirs.
//   - §7-1 Digivolving: an effect-driven digivolve still pays the printed digivolution cost
//     unless the text says otherwise, which is why `payCost: true` below. The digivolving
//     Digimon keeps its suspended/attacking state, so the attack continues with the new top card.
//
// The header "[Dorumon]/Lv.3 w/[Chronicle] trait: Cost 2" is BT20-051's header verbatim, so it
// compiles the same way: TWO alternate requirements at cost 2 — the exact printed name, and the
// COLORLESS "Lv.3 w/[Chronicle] trait". The second entry deliberately carries no `colors`: the
// printed wording names no color, so a RED/Black Lv.3 [Chronicle] Digimon (BT20-010 Ryudamon)
// reaches this card for 2 even though neither catalog EvoCost admits red.
//
// "This Digimon may digivolve into a Digimon card with the [Chronicle] trait in the hand or
// trash" is BT16-071's clause with a trait filter instead of a name filter, so it reuses that
// encoding exactly: a `Digivolve` action whose `target` is the source itself (`isSelfRef` +
// `isSelf`), whose `into` describes the destination CARD, `from: ["hand", "trash"]` for the two
// printed zones, `payCost: true` because no cost reduction or waiver is printed, and
// `optional: true` for the printed "may". `match: "trait"` is the "with the [X] trait" reading.
const minusThreeThousand = (): Action => ({
  kind: "ModifyDP",
  target: { filter: { controller: "opponent", kind: ["Digimon"], zone: "battleArea" }, count: 1 },
  amount: -3000,
  duration: "forTheTurn",
  raw: "1 of your opponent's Digimon gets -3000 DP for the turn",
});

export const compiled: CompiledCard = {
  cardId: "EX13-055",
  effects: [
    { trigger: "OnPlay", actions: [minusThreeThousand()] },
    { trigger: "WhenDigivolving", actions: [minusThreeThousand()] },
    {
      trigger: "WhenAttacking",
      actions: [
        {
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
        },
      ],
    },
    { trigger: "Static", isInherited: true, actions: [], keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }] },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { namesExact: ["Dorumon"], cost: 2, isAlternate: true },
    { level: 3, traits: ["Chronicle"], cost: 2, isAlternate: true },
  ],
};

registerIrCard("EX13-055", compiled);
