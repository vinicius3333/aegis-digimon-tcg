// @ts-nocheck
// Hand-authored override — do not regenerate.
// Inherited effect triggers specifically when an effect adds a card to your hand
// (KB Q1794: also fires when a return-to-hand effect adds a card; Q1795: Draw counts too).
// The event is whenEffectAddsToHand (SubTrigger), not a flat YourTurn trigger — the
// previously-dead "whenCardAddedToHand" name (declared, never fired) collapsed onto it.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenEffectAddsToHand",
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
              "duration": "forTheTurn"
            }
          ]
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT9-002", compiled);
