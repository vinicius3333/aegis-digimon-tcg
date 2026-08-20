import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored IR for BT14-077 (Machinedramon (Virus)). source: documented behavior.
// The AUTO-GENERATED header has been removed to protect this file from overwrite.
//
// SEMANTIC CORRECTIONS (Phase 10.1-02):
//
// The declarative effect record used controller:'mine' for TrashTopDeck (self-mill only) and
// modeled the [Your Turn] once-per-turn clause as a bare GainMemory. Both are wrong:
//
//      BOTH players' decks lose their top 2 cards. Fixed: controller:'both'.
//   2. [Your Turn][Once Per Turn]: fires on `EffectTiming.OnDiscardLibrary` where
//      cardSource.Owner == card.Owner.Enemy — i.e. when a card in the OPPONENT'S deck
//      is trashed, gain 1 memory. WIRED (Phase 13 added the onDiscardLibrary SubTrigger
//      event + the TrashTopDeck fire seam at interpreter.ts): consumed via a SubTrigger
//      watcher gated on the milled deck being the opponent's (interpreter discardLibraryGate
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "TrashTopDeck",
          "controller": "both",
          "amount": 2
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "TrashTopDeck",
          "controller": "both",
          "amount": 2
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "frequency": "OncePerTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "onDiscardLibrary",
          "sourceFilter": { "controller": "opponent" },
          "actions": [
            {
              "kind": "GainMemory",
              "amount": 1
            }
          ],
          "raw": "[Your Turn][Once Per Turn] When a card in your opponent's deck is trashed, gain 1 memory."
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
};

registerIrCard("BT14-077", compiled);
