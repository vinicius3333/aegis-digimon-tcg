// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Digivolve",
          onto: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
              colors: ["Yellow"],
            },
            count: 1,
          },
          asLevel: 3,
          from: "hand",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [],
      keywords: [
        {
          keyword: "Draw",
          amount: 1,
          raw: "＜Draw 1＞",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Hybrid"],
                match: "trait",
              },
            ],
          },
          from: ["hand"],
          payCost: true,
          costDelta: -1,
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          condition: {
            kind: "zoneCount",
            seat: "mine",
            zone: "hand",
            op: "lte",
            value: 7,
            raw: "you have 7 or fewer cards in your hand",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Koji Minamoto"],
      cost: 2,
      isAlternate: true,
      baseIsTamer: true,
    },
    {
      names: ["Lobomon"],
      cost: 1,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT17-023", compiled);
export { compiled };
