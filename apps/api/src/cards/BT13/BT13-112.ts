import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Q2366/Q2367: the second modal branch selects one card of each distinct name from
// the breeding-area stacks and plays every card that can be played.
const modalEffect = (): Action => ({
  kind: "Modal",
  optional: true,
  choose: 1,
  labels: ["Delete 1 of your opponent's Digimon", "Play distinct Royal Knights from breeding"],
  options: [
    [{ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } }],
    [
      {
        kind: "PlayWithoutCost",
        target: {
          filter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Royal Knight"], match: "trait" }],
            distinctNames: true,
            hostFilter: { zone: "breeding" },
          },
          count: "all",
        },
        from: ["digivolutionCards"],
        payCost: false,
        bindResultAs: "playedRoyalKnights",
      },
      {
        kind: "Delete",
        target: { filter: { controller: "mine", zone: "breeding" }, count: 1 },
        condition: { kind: "bindingExists", ref: "playedRoyalKnights" },
      },
      {
        kind: "GainKeyword",
        target: { filter: { controller: "mine", kind: ["Digimon"] }, count: "all" },
        keyword: { keyword: "Rush", raw: "＜Rush＞" },
        duration: "forTheTurn",
        condition: { kind: "bindingExists", ref: "playedRoyalKnights" },
      },
    ],
  ],
});

export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: [modalEffect()] },
    { trigger: "WhenDigivolving", actions: [modalEffect()] },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT13-112", compiled);
