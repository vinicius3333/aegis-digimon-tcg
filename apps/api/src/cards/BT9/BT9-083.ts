// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-corrected IR for BT9-083 (Omnimon: Merciful Mode).
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          scaling: {
            per: 1,
            filter: { controllerDefault: "mine", kind: ["Digimon"], traits: ["Mega"] },
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
        { kind: "Trash", target: { filter: { zone: "digivolutionCards", isSelfRef: true }, count: 1, isSelf: true } },
        { kind: "Trash", target: { filter: { zone: "security", controller: "opponent", position: "top" }, count: 1 }, condition: { kind: "ifThisEffectActed", raw: "you do" } },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT9-083", compiled);
