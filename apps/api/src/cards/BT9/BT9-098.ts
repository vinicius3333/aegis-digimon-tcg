import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-corrected IR for BT9-098 (Awakening of the Golden Knight).
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          condition: {
            kind: "youHave",
            filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Digimon"], traits: ["Armor Form"] },
            raw: "you have a Digimon with [Armor Form] in its traits in play",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "Digivolve",
          target: { filter: { controller: "mine", kind: ["Digimon"], traits: ["Armor Form"] }, count: 1 },
          into: {
            zone: "hand",
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Magnamon"], match: "name" }],
          },
          from: ["hand"],
          payCost: false,
          ignoreDigivolutionRequirements: true,
          optional: true,
          bindResultAs: "digivolvedByThisEffect",
        },
        {
          kind: "Restrict",
          target: { filter: { boundRef: "digivolvedByThisEffect" }, count: 1 },
          restriction: "dpImmune",
          duration: "untilOpponentTurnEnd",
          byOpponentEffectsOnly: true,
          condition: { kind: "ifThisEffectActed", raw: "the Digimon digivolved with this effect" },
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "Return",
          target: {
            filter: { zone: "trash", controller: "mine", nameOrTrait: [{ tokens: ["Magnamon"], match: "name" }] },
            count: 1,
          },
          to: "hand",
        },
        { kind: "AddToHandSelf" },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT9-098", compiled);
