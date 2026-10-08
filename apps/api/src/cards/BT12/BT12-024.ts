import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "TamerOntoDigivolve",
          onto: {
            controller: "mine",
            kind: ["Tamer"],
            colors: ["Blue"],
          },
          asLevel: 3,
          from: ["hand"],
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "Jamming",
            raw: "\uff1cJamming\uff1e",
          },
          duration: "forTheTurn",
          cost: {
            kind: "place",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                colors: ["Blue"],
                levels: [3],
              },
              count: 1,
              from: ["hand"],
            },
            raw: "By placing a blue level 3 Digimon card from your hand under 1 of your blue Digimon as its bottom digivolution card",
            underFilter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Blue"],
            },
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      namesExact: ["Calmaramon"],
      cost: 0,
      isAlternate: true,
    },
    {
      cost: 2,
      isAlternate: true,
      baseIsTamer: true,
      baseColors: ["Blue"],
    },
  ],
};

const module = registerIrCard("BT12-024", compiled);

export default module;
