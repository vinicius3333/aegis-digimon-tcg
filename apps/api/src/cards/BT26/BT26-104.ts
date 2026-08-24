// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const shambala = { nameOrTrait: [{ tokens: ["Shambala"], match: "trait" }] };
const self = { filter: { isSelfRef: true }, count: 1, isSelf: true };

export const compiled: CompiledCard = {
  effects: [
    { trigger: "StartOfYourMainPhase", actions: [{ kind: "GainMemory", amount: 1 }] },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 2,
          cost: { kind: "trash", target: { filter: { controller: "mine", zone: "hand", ...shambala }, count: 1 } },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      condition: {
        kind: "youHave",
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Tentei Hachibushu"], match: "trait" }],
        },
      },
      actions: [
        {
          kind: "UseOptionWithoutCost",
          filter: { controller: "mine", zone: "hand", kind: ["Option"], ...shambala },
          from: ["hand"],
          payCost: false,
          optional: true,
          allowMultiColor: true,
          cost: { kind: "suspend", target: self },
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-104", compiled);
