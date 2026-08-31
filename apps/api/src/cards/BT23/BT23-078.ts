// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

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
            raw: "your opponent has a Digimon",
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        ...(["whenPlayed", "whenOneOfYoursDigivolves"] as const).map((event) => ({
          kind: "SubTrigger",
          event,
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            or: [
              {
                nameOrTrait: [{ tokens: ["Avian", "Bird", "Beast", "Animal", "Sovereign"], match: "trait" }],
                excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "trait" }],
              },
              { nameOrTrait: [{ tokens: ["CS"], match: "trait" }] },
            ],
          },
          actions: [
            {
              kind: "ModifyDP",
              target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
              amount: 3000,
              duration: "forTheTurn",
              cost: {
                kind: "return",
                target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                raw: "by returning this Tamer to the hand",
              },
              optional: true,
              abortOnDecline: true,
            },
            {
              kind: "Attack",
              target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
              withoutSuspending: false,
              optional: true,
            },
          ],
        })),
      ],
    },
    {
      trigger: "Security",
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT23-078", compiled);
export { compiled };
