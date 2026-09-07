import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// CR 15-7-5 permits suspending Owen even when no Reptile/Dragonkin can receive Piercing.
// Pay the optional processing cost before binding the shared grant/attack target.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "opponentHas",
            filter: {
              controllerDefault: "opponent",
              kind: ["Digimon"],
            },
            raw: "your opponent has a Digimon",
          },
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "CostGatedBlock",
          cost: {
            kind: "suspend",
            target: {
              filter: {
                isSelfRef: true,
              },
              count: 1,
              isSelf: true,
            },
            raw: "By suspending this Tamer",
          },
          optional: true,
          abortOnDecline: true,
          actions: [
            {
              kind: "SelectBind",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["Reptile", "Dragonkin"],
                      match: "trait",
                    },
                  ],
                },
                count: 1,
                bindAs: "piercingTarget",
              },
            },
            {
              kind: "GainKeyword",
              target: {
                fromSelectionRef: "piercingTarget",
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              keyword: {
                keyword: "Piercing",
                raw: "\uff1cPiercing\uff1e",
              },
              duration: "forTheTurn",
            },
            {
              kind: "Attack",
              target: {
                fromSelectionRef: "piercingTarget",
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                },
                count: 1,
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
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT21-081", compiled);
