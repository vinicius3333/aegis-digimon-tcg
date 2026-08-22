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
          "kind": "RawUnparsed",
          "text": "missing-primitive(unaudited): link this Digimon or 1 [Maquinamon] in your hand to 1 of your other Digimon without paying the cost"
        }
      ]
    }
  ],
  "coverage": "partial",
  "residual": ["missing-primitive(unaudited): link this Digimon or 1 [Maquinamon] in your hand to 1 of your other Digimon without paying the cost"]
};

registerIrCard("EX11-027", compiled);
