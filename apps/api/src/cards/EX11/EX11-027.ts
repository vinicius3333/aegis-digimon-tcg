// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "RevealAdd",
          "revealCount": 3,
          "add": [
            { "filter": { "controllerDefault": "mine", "nameOrTrait": [{ "tokens": ["Maquinamon"], "match": "name" }] }, "count": 1, "to": "hand" },
            { "filter": { "controllerDefault": "mine", "nameOrTrait": [{ "tokens": ["Maquinamon"], "match": "text" }] }, "count": 1, "to": "hand" }
          ],
          "rest": "deckBottom"
        },
        {
          "kind": "Modal",
          "choose": 1,
          "optional": true,
          "options": [
            [
              {
                "kind": "Link",
                "target": { "filter": { "isSelfRef": true }, "count": 1, "isSelf": true },
                "recipient": { "filter": { "controller": "mine", "kind": ["Digimon"], "excludeSelf": true }, "count": 1 },
                "payCost": false
              }
            ],
            [
              {
                "kind": "Link",
                "target": { "filter": { "controller": "mine", "nameOrTrait": [{ "tokens": ["Maquinamon"], "match": "name" }] }, "count": 1 },
                "from": ["hand"],
                "recipient": { "filter": { "controller": "mine", "kind": ["Digimon"], "excludeSelf": true }, "count": 1 },
                "payCost": false
              }
            ]
          ]
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX11-027", compiled);
