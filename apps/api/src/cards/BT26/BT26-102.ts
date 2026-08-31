// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const sevenCode = {
  controller: "mine",
  kind: ["Digimon", "Tamer"],
  nameOrTrait: [{ tokens: ["Seven Code"], match: "trait" }],
};
const appmon = {
  controller: "mine",
  kind: ["Digimon", "Tamer"],
  playCostLte: 5,
  nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }],
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          condition: { kind: "youHave", filter: sevenCode },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Seven Code"], match: "trait" }],
            },
            count: 6,
          },
          destination: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Seven Code"], match: "trait" }],
            },
            count: 1,
          },
          bindHostAs: "sevenCodeHost",
          mixedSources: { battleAreaPermanents: true, linkedCards: true, trash: true },
          position: "bottom",
          order: "any",
          trackCount: "sevenCodeMaterials",
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "Digivolve",
          target: { filter: { boundRef: "sevenCodeHost" }, count: 1 },
          into: {
            filter: {
              controller: "mine",
              zone: "hand",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Dantemon"], match: "name" }],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          ignoreRequirements: true,
          optional: true,
          condition: { kind: "namedCountAtLeast", countSource: "sevenCodeMaterials", count: 6 },
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: appmon, count: 1 },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
        { kind: "AddToHandSelf" },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-102", compiled);
