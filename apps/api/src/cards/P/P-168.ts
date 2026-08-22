// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const aquaOrSeaAnimal = {
  kind: ["Digimon"] as const,
  nameOrTrait: [{ tokens: ["Aqua", "Sea Animal"], match: "trait" as const }],
};

const compiled: CompiledCard = {
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
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          sourceFilter: { controller: "mine", ...aquaOrSeaAnimal },
          actions: [
            {
              kind: "Digivolve",
              target: {
                filter: { controller: "mine", ...aquaOrSeaAnimal },
                count: 1,
                sourceRef: "triggerSubject",
              },
              into: {
                controllerDefault: "mine",
                ...aquaOrSeaAnimal,
              },
              from: ["hand"],
              payCost: true,
              reduceCost: 1,
              optional: true,
              cost: {
                kind: "suspend",
                target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                raw: "by suspending this Tamer",
              },
            },
          ],
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-168", compiled);
