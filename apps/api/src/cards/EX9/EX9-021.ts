import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  coverage: "full",
  residual: [],
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Restrict",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          restriction: "beAffected",
          byOpponentEffectsOnly: true,
          duration: "forTheTurn",
          condition: { kind: "isDnaDigivolving", raw: "If DNA digivolving" },
        },
        {
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], superlative: "highestLevel" },
            count: "all",
          },
        },
      ],
    },
    {
      trigger: "EndOfAttack",
      optional: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                { tokens: ["Greymon"], match: "name" },
                { tokens: ["Ver.1"], match: "trait" },
              ],
            },
            count: 1,
          },
          fromOwnDigivolutionStack: true,
          payCost: false,
          bindResultAs: "firstPlayed",
        },
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                { tokens: ["Garurumon"], match: "name" },
                { tokens: ["Ver.2"], match: "trait" },
              ],
            },
            count: 1,
          },
          fromOwnDigivolutionStack: true,
          payCost: false,
          bindResultAs: "secondPlayed",
        },
        {
          kind: "SecurityManipulation",
          op: "addTop",
          controller: "mine",
          source: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          condition: {
            kind: "anyOf",
            conditions: [
              { kind: "bindingExists", ref: "firstPlayed" },
              { kind: "bindingExists", ref: "secondPlayed" },
            ],
          },
        },
      ],
    },
  ],
  dnaDigivolveRequirement: [
    {
      cost: 0,
      materials: [
        { color: "Red", level: 6 },
        { color: "Blue", level: 6 },
      ],
    },
  ],
};

registerIrCard("EX9-021", compiled);
export default compiled;
