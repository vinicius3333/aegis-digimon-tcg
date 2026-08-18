// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q1023 (binding): "another Digimon with the same name as this Digimon" refers to the
// name of the Digimon this card has digivolved into (the current top-card name), not [Keramon].
// KB Q2814 (binding): triggers only once even when multiple same-named Digimon are played
// simultaneously (e.g. via token creation). Encoded as oncePerTiming:true.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenPlayed",
          "sourceFilter": {
            "controllerDefault": "mine",
            "excludeSelf": true,
            "kind": [
              "Digimon"
            ],
            "isSameName": true,
            "sameNameAs": "sourceTopCard"
          },
          "oncePerTiming": true,
          "raw": "when you play another Digimon with the same name as this Digimon (the name of the Digimon this has digivolved into)",
          "actions": [
            {
              "kind": "Draw",
              "controller": "mine",
              "amount": 1
            }
          ]
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT2-053", compiled);
