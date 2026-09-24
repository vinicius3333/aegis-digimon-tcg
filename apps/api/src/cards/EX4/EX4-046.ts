import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              excludeSelf: true,
              kind: ["Digimon"],
            },
            count: 1,
          },
          into: {
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 6,
              },
              nameOrTrait: [
                {
                  tokens: ["Greymon"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: true,
          costDelta: -2,
          optional: true,
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [
            {
              kind: "RedirectAttack",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              cost: {
                kind: "suspend",
                target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                optional: true,
                raw: "suspend this Digimon",
              },
              abortOnDecline: true,
            },
          ],
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX4-046", compiled);
