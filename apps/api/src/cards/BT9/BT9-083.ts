import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-corrected IR for BT9-083 (Omnimon: Merciful Mode).
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
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
