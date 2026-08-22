// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "PlaceUnder",
          target: { filter: { controller: "mine" }, count: 1 },
          underFilter: { controllerDefault: "mine", kind: ["Tamer"] },
          optional: true,
          faceDown: true,
          position: "bottom",
        },
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "opponentHas",
            filter: { controllerDefault: "opponent", kind: ["Digimon"] },
            raw: "your opponent has a Digimon",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlaceUnder",
          target: { filter: { controller: "mine" }, count: 1 },
          underFilter: { controllerDefault: "mine", kind: ["Tamer"] },
          optional: true,
          faceDown: true,
          position: "bottom",
        },
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "opponentHas",
            filter: { controllerDefault: "opponent", kind: ["Digimon"] },
            raw: "your opponent has a Digimon",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDigivolutionTrashed",
          actions: [
            {
              kind: "ModifyDP",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Glowing Dawn"], match: "trait" }],
                },
                count: 1,
              },
              amount: 3000,
              duration: "untilOpponentTurnEnd",
              cost: { kind: "suspend" },
              optional: true,
              abortOnDecline: true,
            },
          ],
          raw: "When effects trash cards from under this Tamer, by suspending this Tamer, 1 of your [Glowing Dawn] trait Digimon gets +3000 DP until your opponent's turn ends.",
        },
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

registerIrCard("ST23-13", compiled);
export { compiled };
