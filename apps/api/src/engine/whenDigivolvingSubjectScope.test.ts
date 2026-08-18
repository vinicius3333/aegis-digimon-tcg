import { describe, it, expect } from "vitest";
import { type PlayerState } from "@aegis/shared";
// Self-register every compiled-IR card module.
import "../cards/index.js";
import { setupEngine, settle, type PermanentSpec } from "./testkit/harness.js";

/** Every permanent in this suite carries one digivolution card (BT1-009) and 5000 DP. */
function stacked(card: string, extra: Partial<PermanentSpec> = {}): PermanentSpec {
  return { card, dp: 5000, under: ["BT1-009"], ...extra };
}

describe("WhenDigivolving subject scope", () => {
  it("digivolving in breeding does NOT trigger the opponent's [When Digivolving] (BT3-014 DP switch)", async () => {
    // Seat 0 digivolves in the breeding area (BT1-009 Lv.3 -> AD1-001 Lv.4, cost 2).
    // Seat 1 has BT3-014 (Tamer) in battle area — [When Digivolving] switches target
    // opposing Digimon's DP to 1000. `victim` is what gets DP-modded if BT3-014 wrongly fires.
    const s = setupEngine({
      0: { breeding: stacked("BT1-009", { as: "base" }), hand: [{ card: "AD1-001", as: "evolver" }] },
      1: { battleArea: [stacked("BT3-014"), stacked("BT1-009", { as: "victim" })] },
    });
    const p0 = s.state.players[0] as PlayerState;

    s.state.memory = 5;
    const dpBefore = s.perm("victim").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: true });

    await settle(() => p0.breeding?.topCard?.cardId === "AD1-001");
    await settle(() => false, 50);

    // BT3-014 [When Digivolving] MUST NOT have resolved.
    const resolvedOpp = s.events.filter(
      (e) => e.kind === "effectResolved" && (e as { sourceCardId?: string }).sourceCardId === "BT3-014",
    );
    expect(resolvedOpp).toHaveLength(0);
    // Victim DP must be untouched.
    expect(s.perm("victim").currentDP).toBe(dpBefore);
  });

  it("digivolving in breeding does NOT trigger opponent BT24-016 [When Digivolving] security manipulation", async () => {
    // Seat 0 digivolves in breeding area. Seat 1 controls BT24-016 (Lamiamon) in battle area,
    // with a hand card so the effect can fire. Seat 0 gets a security card to make
    // manipulation observable.
    const s = setupEngine({
      0: {
        breeding: stacked("BT1-009", { as: "base" }),
        hand: [{ card: "AD1-001", as: "evolver" }],
        security: [{ card: "BT1-009", as: "secTop", faceUp: true }],
      },
      1: { battleArea: [stacked("BT24-016")], hand: ["BT1-009"] },
    });
    const p0 = s.state.players[0] as PlayerState;

    s.state.memory = 5;
    const securityBefore = p0.security.length;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: true });

    await settle(() => p0.breeding?.topCard?.cardId === "AD1-001");
    await settle(() => false, 50);

    const resolvedLamiamon = s.events.filter(
      (e) => e.kind === "effectResolved" && (e as { sourceCardId?: string }).sourceCardId === "BT24-016",
    );
    expect(resolvedLamiamon).toHaveLength(0);
    // Seat 0's security must be untouched.
    expect(p0.security.length).toBe(securityBefore);
    expect(p0.security[0]?.instanceId).toBe(s.inst("secTop").instanceId);
  });
});

describe("WhenAttacking subject scope", () => {
  it("declaring an attack does NOT trigger the opponent's [When Attacking] (BT24-016)", async () => {
    // Seat 1 has BT24-016 (Lamiamon) whose [When Attacking] manipulates opponent security.
    // Seat 1 also gets one security so the win check doesn't end the game.
    const s = setupEngine({
      0: {
        battleArea: [stacked("BT1-009", { as: "attacker", suspended: false })],
        security: [{ card: "BT1-009", as: "secTop", faceUp: true }],
      },
      1: { battleArea: [stacked("BT24-016")], hand: ["BT1-009"], security: [{ card: "BT1-009", faceUp: true }] },
    });
    const p0 = s.state.players[0] as PlayerState;

    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    await settle(() => false, 100);

    const resolvedLamiamon = s.events.filter(
      (e) => e.kind === "effectResolved" && (e as { sourceCardId?: string }).sourceCardId === "BT24-016",
    );
    expect(resolvedLamiamon).toHaveLength(0);
    expect(p0.security[0]?.instanceId).toBe(s.inst("secTop").instanceId);
  });

  it("declaring an attack still fires the attacker's OWN [When Attacking] (BT4-057 GainMemory)", async () => {
    // Seat 0 attacker: BT4-057 (GrapLeomon) [When Attacking] Gain 1 memory. Seat 1 gets a
    // security to prevent premature game-over.
    const s = setupEngine({
      0: { battleArea: [stacked("BT4-057", { as: "attacker", suspended: false })] },
      1: { security: [{ card: "BT1-009", faceUp: true }] },
    });

    s.state.memory = 3; // non-boundary value
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    // BT4-057 gains 1 memory for the attacker's controller.
    await settle(() => s.state.memory === memoryBefore + 1, 200);
    await settle(() => false, 50);

    expect(s.state.memory).toBe(memoryBefore + 1);
  });
});
