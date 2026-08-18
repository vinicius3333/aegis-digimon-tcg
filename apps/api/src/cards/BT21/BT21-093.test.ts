import { describe, it, expect } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine as setup, settle } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for BT21-093 (Raging Serpentine) — proves the [Main] on-play body ("Delete 1 of your
// opponent's highest DP Digimon. Then, place this card in the battle area.") actually
// resolves when the card is PLAYED, not merely when a hand-crafted `activateEffect` intent
// names its effectKey directly.
//
// Lane R4's dead-clause class: the module used to register this clause exclusively at
// EffectTiming.OnDeclaration (the manually-activated-ability window `activateEffect.ts`
// reaches), a window `applyPlayCard` never fires for an Option — `playCard.ts` only
// auto-fires `EffectTiming.OnUseOption` for the resolving Option. Empirically, playing this
// card sent it straight to the trash with NO effect resolution: the clause was unreachable
// from the natural play flow even though `activateEffect` could reach the very same
// registered effect module directly (which is how an earlier version of this test
// "passed" without ever exercising `playCard`). The fix re-homes the clause to
// `EffectTiming.OnUseOption`.
//
// FAILS-WHEN-REVERTED: with the clause back at OnDeclaration only, this playCard call
// leaves the opponent's board untouched and the card lands in the trash instead of the
// battle area (test RED).

describe("BT21-093 [Main] on-play body fires on a real playCard (not dead)", () => {
  it("deletes the opponent's highest-DP Digimon and lands in the battle area", async () => {
    const s = setup(
      {
        0: {
          battleArea: [{ card: "BT1-009", dp: 3000 }], // §4-21 color-requirement source (Red)
          hand: [{ card: "BT21-093", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "AD1-001", dp: 3000, as: "low" },
            { card: "AD1-001", dp: 8000, as: "high" },
          ],
          // Keep the opponent above 3 security so the "reduce use cost by 4" clause doesn't
          // apply here, and the full printed cost (8) is what's being paid.
          security: 4,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    const low = s.perm("low");
    const high = s.perm("high");
    const option = s.inst("option");
    s.state.memory = 0; // maxAffordable for seat 0 (turnSeat) is memory + 10 = 10 >= cost 8

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: option.instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !p1.battleArea.includes(high));
    await settle(() => false, 60); // flush the rest of the resolution

    // NEGATIVE CONTROL: a reverted (OnDeclaration-only) module leaves the board
    // completely unchanged by this playCard call — no delete, no placement, the card
    // silently in the trash.
    expect(p1.battleArea.includes(high)).toBe(false); // highest-DP Digimon deleted
    expect(p1.battleArea.includes(low)).toBe(true); // lower-DP Digimon untouched
    expect(p0.battleArea.some((perm) => perm.topCard?.cardId === "BT21-093")).toBe(true); // placed
    expect(p0.trash.some((c) => c.cardId === "BT21-093")).toBe(false); // NOT trashed
  });
});
