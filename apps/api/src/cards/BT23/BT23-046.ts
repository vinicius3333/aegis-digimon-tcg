import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Fortitude",
          raw: "＜Fortitude＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
          },
          cost: {
            kind: "suspend",
            target: {
              filter: {
                controller: "any",
                kind: ["Digimon", "Tamer"],
              },
              count: 1,
            },
            raw: "By suspending 1 Digimon or Tamer",
          },
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
          },
          cost: {
            kind: "suspend",
            target: {
              filter: {
                controller: "any",
                kind: ["Digimon", "Tamer"],
              },
              count: 1,
            },
            raw: "By suspending 1 Digimon or Tamer",
          },
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [
            {
              kind: "RedirectAttack",
              target: {
                filter: {
                  controller: "mine",
                  suspended: true,
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["Vegetation", "Plant", "Fairy"],
                      match: "traitContains",
                    },
                    {
                      tokens: ["CS"],
                      match: "trait",
                    },
                  ],
                },
                count: 1,
              },
              optional: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      traits: ["CS"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT23-046", compiled);
