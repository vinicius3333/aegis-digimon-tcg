import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
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
          // "By suspending ..., ..." is an OPTIONAL processing condition (CR 15-7-1): the
          // controller may decline it outright (CR 15-7-4), and either side's Digimon or Tamer may
          // be the one suspended (Q5311). Declining skips the restriction (CR 15-7-2).
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
          // "By suspending ..., ..." is an OPTIONAL processing condition (CR 15-7-1): the
          // controller may decline it outright (CR 15-7-4), and either side's Digimon or Tamer may
          // be the one suspended (Q5311). Declining skips the restriction (CR 15-7-2).
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
                      // "in any of its traits" is a substring read: [Carnivorous Plant] and
                      // [Ancient Fairy] qualify. "the [CS] trait" below stays exact.
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
