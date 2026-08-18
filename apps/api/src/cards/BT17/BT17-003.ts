// @ts-nocheck
// Hand-authored override (Bibimon, inherited): [Your Turn][Once Per Turn] When an effect
// places a Tamer card in this Digimon's digivolution cards, gain 1 memory. Modeled as an
// onAddDigivolutionCards SubTrigger anchored on this Digimon (the placed card is a Tamer).
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "onAddDigivolutionCards",
          "sourceFilter": {
            "isSelfRef": true
          },
          "actions": [
            {
              "kind": "GainMemory",
              "amount": 1
            }
          ],
          "raw": "When an effect places a Tamer card in this Digimon's digivolution cards, gain 1 memory"
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT17-003", compiled);
