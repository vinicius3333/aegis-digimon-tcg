// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT7-031 Herissmon — inherited effect: when trashed by THIS Digimon's <Digi-Burst>
// activation, return this card to its owner's hand AFTER the Digi-Burst effect resolves
// (Q1551). The engine emits the dedicated onDigiBurstCardDiscarded sub-trigger.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "onDigiBurstCardDiscarded",
          "sourceFilter": { "isSelfRef": true },
          "actions": [
            {
              "kind": "AddToHandSelf"
            }
          ],
          "raw": "When this card is trashed due to activating this Digimon's ＜Digi-Burst＞, return this card to its owner's hand (after Digi-Burst effect resolves)"
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT7-031", compiled);
