import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-005 Bebydomon (Digi-Egg, Green, Lv.2 In-Training [Baby Dragon]).
// Printed inherited effect, and the card's only clause:
//   [When Attacking] [Once Per Turn] You may play or use 1 card with [Dracomon] or [Examon]
//   in its text from your hand with the cost reduced by 1.
//
// "Play or use" is two verbs, so the body is a Modal with one branch each — PlayWithoutCost
// for the playable kinds and UseOptionWithoutCost for the Option side — exactly as EX12-013
// and BT26-006 encode the same sentence. `runModal` skips a branch with no legal candidate
// and auto-selects when only one remains, and both branches carry `optional: true`, so the
// printed "you may" survives the branch choice.
//
// `payCost: true` with `reduceCostBy: 1` on the action itself scopes the discount to the one
// card this activation chooses. A sibling `wouldBePlayed` reduceCost replacement would instead
// install an unscoped subscription discounting every play in the window, and has no
// Option-use path at all.
//
// "with [Dracomon] or [Examon] in its text" is comprehensive rules §4-22-1: the token anywhere
// in the printed information, which the engine's `match: "text"` reference models as the
// name ∪ traits ∪ every printed text field. One reference with both tokens — `tokens` is an
// OR-list — keeps it a single union rather than an accidental conjunction.
//
// No DigiXros allowance: no [Dracomon]/[Examon] card in the catalog carries a DigiXros
// requirement, so `allowDigiXros` (BT26-006) would widen the clause past anything it can reach.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Modal",
          choose: 1,
          labels: ["Play a matching card", "Use a matching Option"],
          options: [
            [
              {
                kind: "PlayWithoutCost",
                target: {
                  filter: {
                    controllerDefault: "mine",
                    zone: "hand",
                    kind: ["Digimon", "Tamer"],
                    nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }],
                  },
                  count: 1,
                },
                from: ["hand"],
                payCost: true,
                reduceCostBy: 1,
                optional: true,
              },
            ],
            [
              {
                kind: "UseOptionWithoutCost",
                filter: {
                  controllerDefault: "mine",
                  zone: "hand",
                  kind: ["Option"],
                  nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }],
                },
                from: ["hand"],
                payCost: true,
                reduceCostBy: 1,
                optional: true,
              },
            ],
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX13-005", compiled);
