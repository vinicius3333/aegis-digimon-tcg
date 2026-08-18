// @ts-nocheck
// hand-authored override
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT15-037 Sunarizamon (BT15, Red Digimon).
//
// Printed text (no errata):
//   [When Trashed From Security] You may play this card without paying its memory cost.
//   [All Turns][Once Per Turn] When your security stack is removed from, gain 1 memory.
//   [Inherited][All Turns] When this Digimon would be deleted in battle, by trashing
//   the top card of your security stack, prevent that deletion (＜Barrier＞, native combat
//   keyword — not modeled as an IR action).
//
// Migration note: the prior hand-written module modeled clause 1 as a dead
// "whenTrashedFromSecurity" SubTrigger event (declared, never fired) with a literal no-op
// resolve, and wrongly modeled clause 2 under EffectTiming.OnDiscardSecurity (which means
// "an effect trashed THIS card from security" — the opposite direction of "your security stack
// was removed from"). Fixed: clause 1 now uses the real EffectTiming.OnDiscardSecurity path
// (fires only from GameEngine.fireDiscardedFromSecurity); clause 2 uses the already-live
// whenSecurityRemoved SubTrigger event nested under AllTurns (precedent: EX12-045, BT4-088).
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnDiscardSecurity",
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
          "payCost": false,
          "optional": true
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenSecurityRemoved",
          "sourceFilter": {
            "isSelfRef": true
          },
          "actions": [
            {
              "kind": "GainMemory",
              "amount": 1
            }
          ]
        }
      ],
      "frequency": "OncePerTurn"
    },
    {
      "trigger": "Static",
      "actions": [],
      "isInherited": true,
      "keywords": [
        {
          "keyword": "Barrier",
          "raw": "＜Barrier＞"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT15-037", compiled);
