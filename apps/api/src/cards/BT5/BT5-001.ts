// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "Draw",
          "controller": "mine",
          "amount": 1,
          "condition": {
            "kind": "selfHasNameContaining",
            "names": [
              "Omnimon",
              "Greymon"
            ],
            "excludeNames": [
              "DoruGreymon",
              "BurningGreymon",
              "DexDoruGreymon"
            ],
            "raw": "this Digimon has [Omnimon] or [Greymon] other than [DoruGreymon], [BurningGreymon], or [DexDoruGreymon] in its name"
          }
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT5-001", compiled);
