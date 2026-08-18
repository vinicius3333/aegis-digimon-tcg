// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "onDigiBurstCardDiscarded",
          "sourceFilter": {
            "isSelfRef": true
          },
          "actions": [
            {
              "kind": "AddToHandSelf"
            }
          ],
          "raw": "When this card is trashed due to activating this Digimon's ＜Digi-Burst＞, return this card to its owner's hand"
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT4-021", compiled);
