// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      isInherited: true,
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Black"],
              nameOrTrait: [{ tokens: ["X Antibody"], match: "trait" }],
            },
            from: ["hand"],
            count: 1,
          },
          underFilter: { isSelfRef: true },
          position: "bottom",
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "Restrict",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          restriction: "beDeleted",
          duration: "untilOpponentTurnEnd",
          condition: { kind: "ifThisEffectActed" },
        },
        {
          kind: "Restrict",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          restriction: "dpImmune",
          duration: "untilOpponentTurnEnd",
          condition: { kind: "ifThisEffectActed" },
        },
      ],
    },
    {
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "GainKeyword",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          keyword: { keyword: "SecurityAttack", amount: 1 },
          condition: { kind: "selfDigivolutionStackHasTrait", filter: { nameOrTrait: [{ tokens: ["X Antibody"], match: "trait" }] } },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT7-064", compiled);
