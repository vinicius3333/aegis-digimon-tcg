import { describe, it, expect } from "vitest";
import { type AttackTarget } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for P-169 (Close, Black Tamer) — its [Security] clause: "Play this card without
// paying the cost."
//
// FAILS-WHEN-REVERTED: the module had no EffectTiming.SecuritySkill branch at all — the
// printed [Security] ability was entirely unported, so a security check against this card
// only revealed and trashed it (per the default security-check flow) instead of playing
// it onto the battle area for free.
describe("P-169 [Security] play this card without paying the cost", () => {
  it("plays the Tamer onto the battle area during a security check, at no memory cost", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "P-169", as: "secCard" }] },
        1: { battleArea: [{ card: "BT1-009", dp: 3000, as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;

    s.state.turnSeat = 1;
    s.state.memory = 0;

    const attacker = s.perm("attacker");
    const res = s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "player" } satisfies AttackTarget,
    });
    expect(res).toEqual({ ok: true });

    await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === "P-169"), 600);

    expect(p0.battleArea.some((p) => p.topCard?.cardId === "P-169")).toBe(true);
    const secCard = s.inst("secCard");
    expect(p0.security.some((c) => c.instanceId === secCard.instanceId)).toBe(false);
    expect(s.state.memory).toBe(0); // played for free, no memory cost paid
  });
});
