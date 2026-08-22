// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q4259: "If a Digimon card with the [X Antibody] trait is in this Digimon's digivolution
// cards, can this Digimon attack?" → No. The restriction therefore remains active when only
// an X Antibody trait card is present; a Gotsumon-named card is the permitted exception.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        { "keyword": "Blocker", "raw": "＜Blocker＞" }
      ]
    },
    {
      // [Your Turn] This Digimon without [Gotsumon]/[X Antibody] in its digivolution cards can't attack.
      // = This Digimon can't attack UNLESS it has a [Gotsumon]-named card in digivolution cards.
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "Restrict",
          "target": {
            "filter": { "isSelfRef": true },
            "count": 1,
            "isSelf": true
          },
          "restriction": "attack",
          "duration": "permanent",
          "condition": {
            "kind": "selfLacksInDigivolutionCards",
            "filter": {
              "nameOrTrait": [{ "tokens": ["Gotsumon"], "match": "name" }]
            },
            "raw": "this Digimon has no [Gotsumon] name in its digivolution cards"
          }
        }
      ]
    },
    {
      // [Opponent's Turn] [Once Per Turn] When an attack target is switched,
      // you may unsuspend 1 of your Digimon with <Blocker>.
      "trigger": "OpponentsTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenAttackTargetSwitched",
          "actions": [
            {
              "kind": "Unsuspend",
              "target": {
                "filter": {
                  "controller": "mine",
                  "kind": ["Digimon"],
                  "keywords": ["Blocker"]
                },
                "count": 1
              },
              "optional": true
            }
          ]
        }
      ],
      "frequency": "OncePerTurn"
    },
    {
      // [Inherited] [All Turns] All of your Digimon with <Blocker> get +1000 DP.
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": ["Digimon"],
              "keywords": ["Blocker"]
            },
            "count": "all"
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
      "names": ["Gotsumon"],
      "cost": 0,
      "isAlternate": true
    }
  ]
};

registerIrCard("P-144", compiled);
