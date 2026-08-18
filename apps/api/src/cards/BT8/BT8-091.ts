import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Compiled effect IR for BT8-091 (Willis, Green Lv.3 Tamer; cost 3).
//
// The AUTO-GENERATED header was removed (card-module contract) to preserve this hand-edit
// across regeneration. Only the [On Play] hatch clause is changed: the runtime record had no
// hatch-from-effect verb, so it emitted RawUnparsed ("hatch 1 Digi-Egg card to an empty
// space in your breeding area"). With the engine's new Hatch primitive (breeding.ts; wired
// through interpreter.ts case "Hatch") the clause is now the structured `Hatch` action, which
// flips the top of the controller's Digi-Egg deck into the empty breeding slot (Comprehensive
// Rules §4-17-1). The remaining clauses are the unchanged declarative effect record.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          // "You may hatch 1 Digi-Egg." Hatching is into the controller's own (empty)
          // breeding area; the primitive no-ops if the area is occupied or the egg deck
          // is empty (§6-4). Optional preserved from the printed "you may".
          "kind": "Hatch",
          "optional": true
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldDigivolve",
          "mode": "reduceCost",
          "amount": 1,
          "into": {
            "kind": ["Digimon"],
            "nameOrTrait": [{ "tokens": ["Gargomon", "Rapidmon"], "match": "name" }]
          },
          "cost": {
            "kind": "suspend",
            "target": { "filter": { "isSelfRef": true }, "count": 1, "isSelf": true },
            "raw": "by suspending this Tamer"
          },
          "raw": "When one of your Digimon would digivolve into a Digimon with [Gargomon] or [Rapidmon] in its name, you may suspend this Tamer to reduce the digivolution cost by 1",
          "optional": true
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "payCost": false
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": [],
};

registerIrCard("BT8-091", compiled);
