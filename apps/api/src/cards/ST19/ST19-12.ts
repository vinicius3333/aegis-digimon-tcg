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
// Audit findings addressed:
// - The "Familiar Token" in the printed text is Yellow/3000 DP with an [On Deletion] modifier —
//   the token's stats and effect belong in the token registry (packages/shared/src/cards/tokens.ts),
//   which currently has the wrong stats for "Familiar Token" (Purple/1000 DP vs Yellow/3000 DP).
//   Updating the token registry is outside this lane (packages/shared is a hard constraint).
//   The PlayToken action references "Familiar" by name as the engine resolves it via the registry.
//   Spec'd in LANE_A.md: FamiliarTokenStats — update token registry to Yellow/3000 DP + OnDeletion.
// - KB Q860: [On Deletion] on Familiar Tokens fires even though tokens are removed from game
//   when deleted (not placed in trash) — engine must handle this case.
// - PlayToken count:2 is correct; optional:true matches "you may".
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
  "coverage": "partial",
  "residual": [
    "FamiliarTokenStats: token registry has Purple/1000 DP; text says Yellow/3000 DP with OnDeletion (-3000 DP to opponent Digimon for turn). Requires update to packages/shared token registry (LANE_A capability spec).",
    "TokenOnDeletion: engine must fire OnDeletion effects on tokens that are removed-from-game (not trashed) — per KB Q860."
  ]
};

registerIrCard("ST19-12", compiled);
