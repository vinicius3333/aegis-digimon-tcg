import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self = { filter: { isSelfRef: true }, count: 1, isSelf: true } as const;

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Rule",
      actions: [{ kind: "GrantStatic", target: self, grant: "name", tokens: ["ChaosGallantmon"] }],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 10000 } },
            count: 1,
          },
        },
        {
          kind: "TrashTopDeck",
          controller: "both",
          amount: 5,
          condition: { kind: "ifThisEffectDidNotDelete", raw: "no Digimon was deleted by this effect" },
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: { controller: "mine", nameOrTrait: [{ tokens: ["Guilmon"], match: "nameExact" }] },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
        {
          kind: "PlayWithoutCost",
          target: {
            filter: { controller: "mine", nameOrTrait: [{ tokens: ["Takato Matsuki"], match: "nameExact" }] },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX2-012", compiled);
