// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Tamer"],
              nameOrTrait: [
                {
                  tokens: ["Light Fang", "Night Claw"],
                  match: "trait",
                },
              ],
            },
            raw: "you have a Tamer with the [Light Fang]/[Night Claw] trait",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "GainMemory",
          amount: 2,
          cost: {
            kind: "place",
            target: {
              filter: {
                isSelfRef: true,
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Light Fang", "Night Claw"], match: "trait" }],
              },
              count: 1,
              isSelf: true,
            },
            raw: "By placing the top card of this Digimon with the [Light Fang]/[Night Claw] trait as this Digimon's bottom digivolution card",
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX5-007", compiled);
