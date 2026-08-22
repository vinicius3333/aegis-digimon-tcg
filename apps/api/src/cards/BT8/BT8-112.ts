import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const body = {
  actions: [
    {
      kind: "Return",
      target: { filter: { isSelfRef: true, digivolution: true, colorCount: 2 }, count: 1 },
      to: "deckBottom",
      optional: true,
      bindResultAs: "returnedSourceCard",
    },
    {
      kind: "SelectBind",
      target: { filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "hasAny" }, count: 1 },
      condition: { kind: "ifThisEffectActed" },
      bindAs: "trashTarget",
    },
    {
      kind: "TrashDigivolution",
      target: { filter: {}, count: 1, fromSelectionRef: "trashTarget" },
      amount: "all",
      condition: { kind: "ifThisEffectActed" },
    },
    {
      kind: "Return",
      target: { filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "none" }, count: "all" },
      to: "deckBottom",
      optional: true,
      order: "any",
    },
  ],
} as const;

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBeDigivolvedInto",
          sourceFilter: { isSelfRef: true },
          mode: "reduceCost",
          amount: 4,
          cost: {
            kind: "return",
            target: {
              filter: { zone: "trash", controller: "mine", kind: ["Digimon"], colors: ["White"], levels: [7] },
              count: 1,
            },
            to: "deckBottom",
            optional: true,
          },
          raw: "When one of your Digimon would digivolve into this card in your hand, you may return 1 white level 7 Digimon card from your trash to the bottom of your deck to reduce the digivolution cost by 4",
        },
      ],
    },
    { trigger: "WhenDigivolving", actions: body.actions },
    { trigger: "WhenAttacking", actions: body.actions },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT8-112", compiled);
export { compiled };
export default compiled;
