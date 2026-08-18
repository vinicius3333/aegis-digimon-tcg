// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override for BT23-053 (Strikedramon).
// [Your Turn] When any of your Option cards are placed in the battle area, this Digimon
// may digivolve into a Digimon with [Cyberdramon] in its name or the [CS] trait from hand
// with the digivolution cost reduced by 2.
// [Inherited] This Digimon gets +1000 DP.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOptionPlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Option"],
          },
          actions: [
            {
              kind: "Digivolve",
              target: {
                filter: {
                  isSelfRef: true,
                  kind: ["Digimon"],
                },
                count: 1,
                isSelf: true,
              },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  { tokens: ["Cyberdramon"], match: "name" },
                  { tokens: ["CS"], match: "trait" },
                ],
              },
              from: ["hand"],
              reduceCost: 2,
              optional: true,
            },
          ],
          raw: "When any of your Option cards are placed in the battle area, this Digimon may digivolve into a Digimon card with [Cyberdramon] in its name or the [CS] trait from hand with the digivolution cost reduced by 2",
        },
      ],
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "amount": 1000,
          "duration": "permanent"
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 3,
      "traits": [
        "CS"
      ],
      "cost": 2,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT23-053", compiled);
