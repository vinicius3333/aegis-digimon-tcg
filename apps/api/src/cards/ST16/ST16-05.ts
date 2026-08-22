// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

/**
 * ST16-05 — Gotsumon (ST16, Purple Lv.3 Digimon).
 *
 * Note: ST16-05 is a chronic oracle failure — the oracle fixture attacked a player
 * (which should NOT trigger the memory loss). This port matches KB Q822 exactly.
 *
 *   OnDestroyedAnyone (line 15-18): RetaliationSelfEffect (non-inherited) — ＜Retaliation＞ keyword.
 *   OnAllyAttack (line 21-62): [Your Turn] rule implementation — when this Digimon attacks
 *     an opponent's Digimon (DefendingPermanent != null), lose 2 memory.
 *
 * KB Q822 (binding): the [Your Turn] effect only activates if the attack was declared
 * targeting an opponent's Digimon. It does NOT activate for player-targeted attacks.
 */
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Retaliation", raw: "＜Retaliation＞" }],
    },
    {
      trigger: "WhenAttacking",
      actions: [{ kind: "GainMemory", amount: -2 }],
      condition: {
        kind: "allOf",
        conditions: [
          { kind: "isYourTurn" },
          { kind: "triggerAttackerIsSelf" },
          { kind: "not", condition: { kind: "attackTargetsPlayer" } },
        ],
        raw: "this Digimon attacks an opponent's Digimon during your turn",
      },
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST16-05", compiled);
export { compiled };
