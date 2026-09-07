import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const playTamerEffects: CompiledCard["effects"] = (["OnPlay", "WhenDigivolving"] as const).map((trigger) => ({
  trigger,
  actions: [
    {
      kind: "PlayWithoutCost",
      target: {
        filter: {
          controller: "mine",
          kind: ["Tamer"],
          nameOrTrait: [{ tokens: ["Three Musketeers"], match: "text" }],
        },
        count: 1,
      },
      from: ["hand"],
      payCost: false,
      condition: {
        kind: "youHave",
        filter: { controllerDefault: "mine", kind: ["Tamer"], countMax: 1 },
        countMax: 1,
      },
      optional: true,
    },
  ],
}));

export const compiled: CompiledCard = {
  effects: [
    ...playTamerEffects,
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Digivolve",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          into: {
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Three Musketeers"], match: "trait" }],
            },
            count: 1,
          },
          payCost: true,
          costOverride: 4,
          optional: true,
          ignoreRequirements: true,
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Tamer"],
              nameOrTrait: [{ tokens: ["Three Musketeers"], match: "text" }],
            },
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          cost: {
            kind: "place",
            target: {
              filter: { controller: "mine", nameOrTrait: [{ tokens: ["Three Musketeers"], match: "trait" }] },
              count: 1,
              from: ["hand", "trash"],
            },
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
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
    { level: 3, colors: ["Purple"], cost: 3, isAlternate: false },
    { level: 3, colors: ["Black"], cost: 3, isAlternate: false },
    { level: 3, texts: ["Three Musketeers"], cost: 2, isAlternate: true },
    { level: 3, traits: ["TS"], cost: 2, isAlternate: true },
  ],
};

registerIrCard("BT25-082", compiled);
