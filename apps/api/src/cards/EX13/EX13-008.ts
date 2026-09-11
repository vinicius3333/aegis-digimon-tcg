import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-008 Dracomon (Red, Lv.3 Rookie [Dragon], Data, play cost 3, DP 1000).
//
// [Digivolve] [Bebydomon]: Cost 0
//   A bracketed bare [Name], so `namesExact` — not the substring `names` — exactly as
//   BT21-046 encodes its own "[Digivolve] [Dracomon]: Cost 0" header. The path is ADDITIVE
//   to the printed Red Lv.2 evoCost: it is what lets the off-color Bebydomon prints
//   (EX13-005 green, BT10-002/BT20-002/EX3-001 blue) reach this card for 0.
//
// [When Moving] [On Play] Reveal the top 3 cards of your deck. Add 1 card with [Dracomon]
// or [Examon] in its text among them to the hand. Return the rest to the bottom of the deck.
//   One clause printed under two timings, so it is two effects sharing one action list —
//   the EX13-007 / BT26-008 shape, not a single effect with a compound trigger.
//
//   "with [Dracomon] or [Examon] in its text" is comprehensive rules §4-22-1: the token
//   anywhere in the printed information, which `match: "text"` models as name ∪ traits ∪
//   every printed text field. Both tokens live in ONE reference because `tokens` is an
//   OR-list; two separate references would read as a conjunction. Sibling EX13-005 encodes
//   the identical phrase the same way.
//
//   The sentence carries no "you may", so the add slot is mandatory (no `optional`/`upTo`):
//   with a match revealed, the card goes to hand. `rest: "deckBottom"` is the printed
//   "Return the rest to the bottom of the deck".
//
// [Inherited] [End of Your Turn] This Digimon and any of your other Digimon may DNA
// digivolve into a Digimon card in the hand.
//   Verbatim the sentence on BT21-046 / BT22-008 / BT22-017, so it reuses BT21-046's proven
//   encoding: a 2-material DnaDigivolve pinned to the host (`isSelf` + `includesSelf`), into
//   a Digimon card in hand, `payCost: true` — the text grants no cost waiver, so the
//   destination's own printed DNA cost is paid — and `optional: true` for the printed "may".
const revealAddDracomonOrExamon = (): Action => ({
  kind: "RevealAdd",
  revealCount: 3,
  add: [
    {
      filter: {
        controllerDefault: "mine",
        nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }],
      },
      count: 1,
      to: "hand",
    },
  ],
  rest: "deckBottom",
});

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenMoving",
      actions: [revealAddDracomonOrExamon()],
    },
    {
      trigger: "OnPlay",
      actions: [revealAddDracomonOrExamon()],
    },
    {
      trigger: "EndOfYourTurn",
      isInherited: true,
      actions: [
        {
          kind: "DnaDigivolve",
          materials: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              includesSelf: true,
            },
            count: 2,
            isSelf: true,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            zone: "hand",
          },
          payCost: true,
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      namesExact: ["Bebydomon"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX13-008", compiled);
