import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const csDigimon = {
  controller: "mine" as const,
  kind: ["Digimon" as const],
  nameOrTrait: [{ tokens: ["CS"], match: "trait" as const }],
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "opponentHas",
            filter: { controllerDefault: "opponent", kind: ["Digimon"] },
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      timingOverride: "OnEnterFieldAnyone",
      optional: true,
      condition: {
        kind: "allOf",
        conditions: [
          { kind: "isYourTurn" },
          { kind: "triggerSubjectMatchesFilter", filter: csDigimon },
          { kind: "triggerSubjectStackHasSameLevel" },
        ],
      },
      actions: [
        {
          kind: "CostGatedBlock",
          cost: {
            kind: "suspend",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            raw: "by suspending this Tamer",
          },
          actions: [
            {
              kind: "Digivolve",
              target: { sourceRef: "triggerSubject", filter: csDigimon, count: 1 },
              into: { controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: csDigimon.nameOrTrait },
              from: ["hand"],
              payCost: false,
              optional: true,
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

registerIrCard("BT22-093", compiled);
export default compiled;
