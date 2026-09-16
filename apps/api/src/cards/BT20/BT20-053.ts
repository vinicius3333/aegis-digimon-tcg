import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] You may play 1 [Dorumon]/[Ryudamon] from your hand to your empty breeding area without paying the cost.",
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
          effectTextPart:
            "Then, if during an attack until the end of your opponent's turn, 1 of your Digimon isn't affected by your opponent's Digimon's effects and gets +5000 DP.",
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
          effectTextPart:
            "[On Play] [When Digivolving] You may play 1 [Dorumon]/[Ryudamon] from your hand to your empty breeding area without paying the cost.",
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
          effectTextPart:
            "Then, if during an attack until the end of your opponent's turn, 1 of your Digimon isn't affected by your opponent's Digimon's effects and gets +5000 DP.",
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
      namesExact: ["Raptordramon"],
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
