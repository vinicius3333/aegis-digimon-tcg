import { describe, it, expect } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine as setup, settle, assertNoLoudGap } from "../../engine/testkit/harness.js";
// Self-registers every card module (boot side-effect) so the engine can look up
// AD1-010's inherited <Jamming> keyword grant.
import "../index.js";
import { compiled } from "./AD1-010.js";

/**
 * A3 for AD1-010 (Garurumon) — Inherited Effect ＜Jamming＞ ("can't be deleted in
 * battles against Security Digimon").
 *
 * `ctx.fx.grantKeyword` (the generic keyword-grant primitive, engine/effects/primitives.ts)
 * is consumed at the combat/security seam via `hasKeyword(..., "Jamming")`
 * (engine/security/securityCheck.ts battleSecurityDigimon). This proves the grant is real,
 * observable engine state — not just that the primitive was called — by driving an actual
 * losing security battle and confirming the attacker survives.
 *
 * `isInherited: true` (engine/effects/kernel.ts passesPlacementGuard) means this Jamming
 * ONLY applies while AD1-010 is a DIGIVOLUTION-STACK card underneath another Digimon, not
 * while it is itself the top card — that is the printed "Inherited Effect" section's
 * semantics (distinct from a directly-printed keyword). The board below stacks AD1-010
 * under a higher-level top card and asserts the TOP permanent inherits Jamming.
 *
 * Only AD1-010's Jamming TODO is addressed here; its two other TODOs (~94 digivolve-from-hand,
 * ~121 alternate digivolve cost) are real engine-primitive gaps left for another lane.
 *
 * FAILS-WHEN-REVERTED: reverting the Jamming clause to its prior no-op TODO means
 * `hasKeyword(topPermanent, "Jamming")` is false at the security battle, so the low-DP
 * permanent IS deleted — the survival assertion goes RED.
 */
describe("AD1-010 Inherited Effect <Jamming> — survives a losing Security Digimon battle from the stack", () => {
  it("free-digivolves a chosen Digimon into Garurumon when a Greymon is played", async () => {
    const s = setup({
      0: { battleArea: [{ card: "AD1-010", as: "host" }], hand: [{ card: "AD1-001", as: "greymon" }, { card: "BT1-040", as: "garurumon" }] },
    }, { autoSelectCards: true, autoAcceptOptional: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("greymon").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT1-040");
    expect(s.perm("host").topCard.cardId).toBe("BT1-040");
  });

  it("models both play/digivolve watchers and alternate digivolution requirements", () => {
    const allTurns = compiled.effects.find((effect) => effect.trigger === "AllTurns");
    expect(allTurns?.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ event: "whenPlayed" }),
        expect.objectContaining({ event: "whenOneOfYoursDigivolves" }),
      ]),
    );
    expect(compiled.digivolutionRequirement).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ level: 3, texts: ["Omnimon"], cost: 2 }),
        expect.objectContaining({ level: 3, traits: ["ADVENTURE"], cost: 2 }),
      ]),
    );
  });

  it("a low-DP top card stacked over AD1-010 is NOT deleted by a higher-DP Security Digimon (Jamming)", async () => {
    // The permanent's top card is a plain 1000-DP Digimon that would normally lose a
    // security battle against a 3000-DP Security Digimon and be deleted (CR 13-1-8-3).
    // AD1-010 sits UNDERNEATH it as digivolution-stack material, inheriting Jamming up.
    const s = setup({
      0: { battleArea: [{ card: "AD1-001", dp: 1000, as: "attacker", under: ["AD1-010"] }] },
      1: { security: ["BT1-009"] }, // 3000 DP Security Digimon
    });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    const attacker = s.perm("attacker");

    // The static (EffectTiming.None) Jamming grant is derived by the continuous-recompute
    // pass; force it here for the hand-laid board (mirrors engine/continuousColor.test.ts).
    await s.engine.recomputeContinuousEffects();
    expect(
      (s.engine as unknown as { continuous: { hasKeyword(id: string, k: string): boolean } }).continuous.hasKeyword(
        attacker.permanentId,
        "Jamming",
      ),
    ).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    await settle(() => p1.security.length === 0);
    await settle(() => p0.battleArea.some((p) => p.permanentId === attacker.permanentId));

    expect(p0.battleArea.some((p) => p.permanentId === attacker.permanentId)).toBe(true); // still alive
    expect(p0.trash.some((c) => c.instanceId === attacker.topCard?.instanceId)).toBe(false);
    assertNoLoudGap(s);
  });

  it("negative control: AD1-010 as the TOP card (not stacked) does NOT grant itself Jamming — it is an Inherited Effect", async () => {
    const s = setup({
      0: { battleArea: [{ card: "AD1-010", dp: 1000, as: "attacker" }] }, // AD1-010 itself on top, nothing stacked
      1: { security: ["BT1-009"] }, // 3000 DP Security Digimon
    });
    const p0 = s.state.players[0] as PlayerState;
    const attacker = s.perm("attacker");

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    await settle(() => !p0.battleArea.some((p) => p.permanentId === attacker.permanentId));

    expect(p0.battleArea.some((p) => p.permanentId === attacker.permanentId)).toBe(false); // deleted
    assertNoLoudGap(s);
  });
});
