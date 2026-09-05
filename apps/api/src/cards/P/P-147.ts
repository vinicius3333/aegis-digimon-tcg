// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "ActivateForeignEffect",
          zone: "digivolutionCards",
          fromTriggers: ["WhenDigivolving"],
          filter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            levels: [4],
            nameOrTrait: [{ tokens: ["Pulsemon"], match: "text" }],
          },
          lastPlacedOnly: true,
          count: 1,
          cost: {
            kind: "place",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
                levels: [4],
                nameOrTrait: [{ tokens: ["Pulsemon"], match: "text" }],
              },
              count: 1,
              from: ["hand"],
            },
            raw: "By placing 1 level 4 card with [Pulsemon] in its text from your hand as this Digimon's bottom digivolution card",
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          effect: {
            kind: "modifyDP",
            amount: 3000,
          },
          while: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Tamer"],
            },
            raw: "you have a Tamer",
          },
        },
      ],
    },
    {
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          grant: "name",
          tokens: ["Pulsemon"],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Bibimon"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("P-147", compiled);
