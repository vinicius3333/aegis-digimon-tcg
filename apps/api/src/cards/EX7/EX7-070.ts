// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const lowestCost = { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestPlayCost" }, count: 1 };
const anyOpponentDigimon = { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 };
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      isInherited: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "onDigivolutionCardDiscarded",
          sourceFilter: {
            isSelfRef: true,
          },
          requireByEffect: true,
          actions: [{ kind: "DeDigivolve", target: anyOpponentDigimon, amount: 1, stopAtLevel: 3 }],
          raw: "When an effect trashes this digivolution card, De-Digivolve 1 an opponent Digimon",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Three Musketeers"], match: "trait" }],
            },
            raw: "you have a Three Musketeers Digimon",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        { kind: "Delete", target: lowestCost },
        {
          kind: "PlaceUnder",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          underFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Three Musketeers"], match: "trait" }],
          },
          position: "bottom",
        },
      ],
    },
    { trigger: "Security", isSecurity: true, actions: [{ kind: "Delete", target: lowestCost }] },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX7-070", compiled);
