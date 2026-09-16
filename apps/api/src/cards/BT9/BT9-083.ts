import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart:
            "[When Digivolving] For each card with [Mega] in their traits in this Digimon’s digivolution cards, delete 1 of your opponent’s Digimon.",
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1, forceSelection: true },
          scaling: {
            per: 1,
            filter: { controllerDefault: "mine", kind: ["Digimon"], forms: ["Mega"] },
            unit: "digivolutionCards",
          },
        },
        {
          kind: "Return",
          target: { filter: { zone: "trash", controller: "opponent" }, count: 10, upTo: true },
          to: "deckBottom",
          order: "any",
        },
      ],
    },
    {
      trigger: "StartOfYourTurn",
      actions: [
        {
          kind: "Trash",
          target: {
            filter: { zone: "digivolutionCards", hostFilter: { isSelfRef: true }, position: "top" },
            count: 1,
          },
        },
        {
          kind: "Trash",
          target: { filter: { zone: "security", controller: "opponent", position: "top" }, count: 1 },
          condition: { kind: "ifThisEffectActed", raw: "you do" },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ names: ["Omnimon"], cost: 3, isAlternate: true }],
};

registerIrCard("BT9-083", compiled);
