import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Return",
          target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestLevel" }, count: 1 },
          to: "hand",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Return",
          target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestLevel" }, count: 1 },
          to: "hand",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        // The printed "your or your opponent's hand" wording is represented by two
        // directional buses, sharing one once-per-turn key.
        {
          kind: "SubTrigger",
          event: "whenEffectAddsToHand",
          oncePerTurnKey: "BT17-028/hand-add",
          actions: [{ kind: "SecurityManipulation", op: "toHand", controller: "opponent", amount: 1, toTop: true }],
        },
        {
          kind: "SubTrigger",
          event: "whenEffectAddsToOpponentHand",
          oncePerTurnKey: "BT17-028/hand-add",
          actions: [{ kind: "SecurityManipulation", op: "toHand", controller: "opponent", amount: 1, toTop: true }],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          effectTextPart:
            "[On Deletion] You may return 1 Tamer card and 1 [Hybrid] trait Digimon card from your trash to the hand.",
          kind: "Return",
          target: { filter: { zone: "trash", controller: "mine", kind: ["Tamer"] }, count: 1 },
          to: "hand",
          optional: true,
        },
        {
          effectTextPart:
            "[On Deletion] You may return 1 Tamer card and 1 [Hybrid] trait Digimon card from your trash to the hand.",
          kind: "Return",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Hybrid"], match: "trait" }],
            },
            count: 1,
          },
          to: "hand",
          optional: true,
        },
        {
          effectTextPart:
            "Then, you may play 1 Tamer card from your hand without paying the cost.\n\n[DigiXros -3] [Lobomon] x [KendoGarurumon]",
          kind: "PlayWithoutCost",
          target: { filter: { controller: "mine", kind: ["Tamer"] }, count: 1 },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digiXrosRequirement: [
    {
      materials: [{ names: ["Lobomon"] }, { names: ["KendoGarurumon"] }],
      count: 3,
    },
  ],
};

registerIrCard("BT17-028", compiled);
