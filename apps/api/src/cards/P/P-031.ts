// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q4144: Aura check is real-time at "reaction timing"; if the purple Digimon is
// deleted by the attacking Digimon's When Attacking effect, Blocker is gone at reaction.
const compiled: CompiledCard = {
  "effects": [
    {
      // [Opponent's Turn] While you have a purple Digimon in play, this Digimon gains <Blocker>.
      // Continuous conditional aura during opponent's turn; not an activated [Main] effect.
      "trigger": "OpponentsTurn",
      "actions": [
        {
          "kind": "Aura",
          "target": {
            "filter": { "isSelfRef": true },
            "count": 1,
            "isSelf": true
          },
          "effect": {
            "kind": "keyword",
            "keyword": { "keyword": "Blocker", "raw": "＜Blocker＞" }
          },
          "while": {
            "kind": "youHave",
            "filter": {
              "zone": "battleArea",
              "controllerDefault": "mine",
              "kind": ["Digimon"],
              "colors": ["Purple"]
            },
            "raw": "you have a purple Digimon in play"
          }
        }
      ]
    },
    {
      // [On Play] If you have 3 or fewer security cards, trigger <Recovery +1 (Deck)>.
      // <Recovery +1 (Deck)> = place top card of your deck on top of your security stack.
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "SecurityManipulation",
          "op": "addTop",
          "controller": "mine",
          "source": "deck",
          "amount": 1,
          "condition": {
            "kind": "zoneCount",
            "seat": "mine",
            "zone": "security",
            "op": "lte",
            "value": 3,
            "raw": "you have 3 or fewer security cards"
          }
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("P-031", compiled);
