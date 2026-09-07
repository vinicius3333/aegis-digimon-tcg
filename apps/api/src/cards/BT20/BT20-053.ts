import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Dorumon", "Ryudamon"],
                  match: "nameExact",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          breeding: true,
          requiresEmpty: "breedingArea",
          optional: true,
        },
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 5000,
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "duringAttack",
            raw: "during an attack",
          },
          optional: false,
        },
        {
          kind: "GrantImmunity",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
            sameTarget: true,
          },
          immuneFrom: "opponentDigimonEffects",
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "duringAttack",
            raw: "during an attack",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Dorumon", "Ryudamon"],
                  match: "nameExact",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          breeding: true,
          requiresEmpty: "breedingArea",
          optional: true,
        },
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 5000,
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "duringAttack",
            raw: "during an attack",
          },
          optional: false,
        },
        {
          kind: "GrantImmunity",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
            sameTarget: true,
          },
          immuneFrom: "opponentDigimonEffects",
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "duringAttack",
            raw: "during an attack",
          },
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
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              optional: true,
            },
          ],
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Raptordramon"],
      cost: 3,
      isAlternate: true,
    },
    {
      level: 4,
      traits: ["Chronicle"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT20-053", compiled);
