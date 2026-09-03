import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
          optional: true,
          cost: { kind: "suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "GrantStatic",
          grant: "effects",
          tokens: ["[When Attacking] Lose 1 memory."],
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: { op: "eq", value: 3 },
            },
            count: "all",
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      attackScope: "ally",
      condition: {
        kind: "triggerAttackerMatchesFilter",
        filter: { controllerDefault: "mine", kind: ["Digimon"], levelComparison: { op: "eq", value: 3 } },
      },
      actions: [{ kind: "GainMemory", amount: -1 }],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          from: ["security"],
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT5-091", compiled);
