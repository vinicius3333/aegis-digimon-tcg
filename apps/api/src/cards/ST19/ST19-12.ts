// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// ST19-12 Cendrillmon
// effectText (with errata applied):
//   <Overclock ([Puppet] trait)> (At the end of your turn, by deleting 1 of your Tokens or other
//     [Puppet] trait Digimon, this Digimon attacks a player without suspending.)
//   <Blocker>
//   [When Digivolving] You may play 2 [Familiar] Tokens without paying their costs
//     (Digimon/Yellow/3000 DP/[On Deletion] 1 of your opponent's Digimon gets -3000 DP for the turn).
//
// Familiar Token stats and its On Deletion timing are registered in the shared token registry and
// synthetic token module below. The deletion seams fire that module before removing the token.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Overclock",
          "raw": "＜Overclock ([Puppet] trait)＞"
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Blocker",
          "raw": "＜Blocker＞"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          // Token is "Familiar" resolved from token registry.
          // Registry entry needs update: Yellow/3000 DP + OnDeletion effect (LANE_A: FamiliarTokenStats).
          // KB Q860: OnDeletion fires on tokens even though they're removed-from-game (not trashed).
          "kind": "PlayToken",
          "tokens": [
            "Familiar"
          ],
          "count": 2,
          "payCost": false,
          "optional": true
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("ST19-12", compiled);

// Familiar Tokens are synthetic cards, so their printed [On Deletion] effect is registered
// alongside the card that creates them. The deletion seams fire this timing while the token is
// still available as a source, immediately before it is removed from the game.
registerIrCard("TOKEN-Familiar-Token", {
  effects: [
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: -3000,
          duration: "forTheTurn",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
});
