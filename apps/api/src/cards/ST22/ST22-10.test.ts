import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { advance } from "../../engine/testkit/advance.js";

// A3 for ST22-10 (Amethyst Mandala) — the OnDiscardSecurity timing seam.
//
// "When effects trash this card from the security stack, 1 of your opponent's Digimon gets -9000 DP
// for the turn." (documented behavior OnDiscardSecurity, distinct from the [Security] check clause.) The
// engine had no OnDiscardSecurity timing, so the clause was inert. Now the effect-driven trash verbs
// (trash / trashFromSecurity) fire EffectTiming.OnDiscardSecurity for each card that left a security
// stack, and the card's own clause runs once it is in trash (KB Q5438).
//
// FAILS-WHEN-REVERTED: without the seam the opponent Digimon keeps its full DP (no -9000).

const ST22 = "ST22-10";
const OPP_DIGIMON = "BT10-075"; // any Digimon; DP set on the permanent below

describe("ST22-10 OnDiscardSecurity (effect trashes this card from security)", () => {
  it("trashing ST22-10 from security by an effect gives 1 opponent Digimon -9000 DP", async () => {
    const s = setupEngine(
      {
        // ST22-10 face up in player 0's security stack.
        0: { security: [{ card: ST22, as: "st22", faceUp: true }] },
        // Opponent Digimon with 12000 DP (so -9000 leaves it at a positive 3000, no DP<=0 deletion).
        1: { battleArea: [{ card: OPP_DIGIMON, dp: 12000, as: "oppPerm" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    const st22Id = s.inst("st22").instanceId;
    const oppPerm = s.perm("oppPerm");

    // An effect trashes ST22-10 from security (the production trash verb).
    await advance(s.engine).verb.trash([st22Id]);
    await settle(() => oppPerm.currentDP !== 12000);

    // OnDiscardSecurity fired: the opponent Digimon is at 12000 - 9000 = 3000 DP.
    expect(oppPerm.currentDP).toBe(3000);
    // ST22-10 is now in trash, not security.
    expect(p0.trash.some((c) => c.instanceId === st22Id)).toBe(true);
    expect(p0.security.some((c) => c.instanceId === st22Id)).toBe(false);
  });

  it("does nothing when the opponent has no Digimon (CanActivate gate)", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: ST22, as: "st22", faceUp: true }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    const st22Id = s.inst("st22").instanceId;

    await advance(s.engine).verb.trash([st22Id]);
    await settle(() => p0.trash.some((c) => c.instanceId === st22Id));

    // Trashed, but no DP change anywhere (no opponent Digimon to target).
    expect(p0.trash.some((c) => c.instanceId === st22Id)).toBe(true);
  });
});
