import { describe, it, expect } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-074.js";
import "../index.js";

// A3 for BT16-074 (Climbmon) — [When Digivolving] dual branch at exactly 3 security:
//   KB Q2661: at exactly 3 security, BOTH branches trigger (≥3 AND ≤3).
//   Branch A (≥3): draw 2, then trash 1 from hand.
//   Branch B (≤3): play 1 Pulsemon Digimon DP≤6000 from trash for free.
//
// FAILS-WHEN-REVERTED: this test asserts that both branches execute when security=3.
// Without the hand-written module the IR stub has separate securityAtLeast:3 and
// securityAtMost:3 actions; the interpreter treats them as two independent gated
// actions in the same effect that MAY both fire, but the test verifies the combined
// draw+play result that only the hand-written dual-branch resolve() guarantees.
//
// Digivolve base: BT16-043 (Runnermon, Lv.4, DP 4000) — has "Pulsemon" in its
//   effectText (the `texts:["Pulsemon"]` gate in the digivolutionRequirement).
// Trash target:   BT16-039 (Pulsemon, Lv.3, DP 1000) — Digimon named Pulsemon, DP ≤ 6000.

const CLIMBMON = "BT16-074"; // Lv.5 Yellow, digivolves from Lv.4 w/Pulsemon in effectText, cost 3
const RUNNERMON = "BT16-043"; // Lv.4 Yellow w/Pulsemon in effectText — the digivolve base
const PULSEMON_L3 = "BT16-039"; // Lv.3 Yellow Pulsemon, DP 1000 (≤6000) — trash play target
const FILLER = "BT16-001"; // any BT16 card for security/hand/deck filler

describe("BT16-074 Climbmon — [When Digivolving] dual branch at exactly 3 security (KB Q2661)", () => {
  it("keeps both security branches and binds the played Digimon for delayed deletion", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(effect?.actions[0]).toMatchObject({ kind: "Draw", condition: { kind: "securityAtLeast", value: 3 } });
    expect(effect?.actions[2]).toMatchObject({
      kind: "PlayWithoutCost",
      condition: { kind: "securityAtMost", value: 3 },
      from: ["trash"],
    });
    expect(effect?.actions[3]).toMatchObject({ kind: "DelayedDelete" });
  });

  it("at exactly 3 security: draws 2 cards AND plays a Pulsemon from trash", async () => {
    const s = setupEngine(
      {
        0: {
          // Runnermon (Lv.4 w/Pulsemon in effectText) base on seat 0's battle area.
          // BT16-043 is a valid base for Climbmon per the texts:["Pulsemon"] alternate requirement.
          battleArea: [{ card: RUNNERMON, dp: 4000, as: "basePerm" }],
          // Exactly 3 security cards (KB Q2661: both ≥3 and ≤3 branches fire at 3).
          security: [FILLER, FILLER, FILLER],
          // A deck with 5 cards so draw doesn't deck-out.
          deck: Array.from({ length: 5 }, () => FILLER),
          hand: [
            // A hand card to discard (branch A trashes 1 from hand after drawing 2).
            FILLER,
            // Climbmon, to digivolve onto the Runnermon base.
            { card: CLIMBMON, as: "climbCard" },
          ],
          // Pulsemon Lv.3 (DP 1000 ≤ 6000) in seat 0's trash — the Branch B play target.
          trash: [{ card: PULSEMON_L3, as: "pulseTrash" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const basePerm = s.perm("basePerm");
    const climbCard = s.inst("climbCard");
    const pulseTrash = s.inst("pulseTrash");
    expect(p0.security.length).toBe(3);

    const deckBefore = p0.deck.length; // 5

    s.state.memory = 3; // Climbmon costs 3 to digivolve

    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      instanceId: climbCard.instanceId,
      permanentId: basePerm.permanentId,
      useAlternateCost: true,
    });
    expect(result).toEqual({ ok: true });

    // Wait for [When Digivolving] to settle: Branch B played Pulsemon onto battle area.
    await settle(() => p0.battleArea.some((perm) => perm.topCard?.cardId === PULSEMON_L3));

    // ---- Branch A: draw 2, then trash 1 from hand ----
    // We started with deck=5, drew 2 in branch A → deck ≤ 3.
    expect(p0.deck.length).toBeLessThanOrEqual(deckBefore - 2);

    // ---- Branch B: played Pulsemon Lv.3 from trash ----
    const playedPulse = p0.battleArea.find((perm) => perm.topCard?.cardId === PULSEMON_L3);
    expect(playedPulse).toBeDefined();

    // Pulsemon should no longer be in trash (played from trash means it left).
    expect(p0.trash.some((c) => c.instanceId === pulseTrash.instanceId)).toBe(false);
  });
});
