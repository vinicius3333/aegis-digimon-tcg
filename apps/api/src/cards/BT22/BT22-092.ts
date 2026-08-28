import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const flameOrCs = {
  controller: "mine" as const,
  kind: ["Digimon" as const],
  nameOrTrait: [{ tokens: ["Flame", "CS"], match: "trait" as const }],
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourTurn",
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2, controller: "mine" } }],
    },
    {
      trigger: "YourTurn",
      timingOverride: "OnEnterFieldAnyone",
      optional: true,
      condition: {
        kind: "allOf",
        conditions: [{ kind: "isYourTurn" }, { kind: "triggerSubjectMatchesFilter", filter: flameOrCs }],
      },
      actions: [
        {
          kind: "CostGatedBlock",
          cost: {
            kind: "suspend",
            optional: true,
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            raw: "by suspending this Tamer",
          },
          actions: [
            { kind: "ReactivateEffect", fromTrigger: "Main", count: 1, targetSource: "triggerSubject" },
            {
              kind: "GainMemory",
              amount: 1,
              condition: { kind: "ifThisEffectActed", raw: "if this activated any effect" },
            },
          ],
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          payCost: false,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT22-092", compiled);
export default compiled;
