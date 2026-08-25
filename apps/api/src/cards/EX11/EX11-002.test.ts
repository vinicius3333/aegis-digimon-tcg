import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX11-002.js";
import "../index.js";

describe("EX11-002 inherited unsuspended-attack permission", () => {
  it("allows the host Digimon to attack an unsuspended opponent Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX11-014", as: "host", under: ["EX11-002"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    });
    await s.ready();
    await settle(() => s.perm("host").attackablePermanentIds.includes(s.perm("target").permanentId), 400);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    assertNoLoudGap(s);
  });

  it("does not grant the attack when any opposing Digimon has digivolution cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX11-014", as: "host", under: ["EX11-002"] }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "target" },
          { card: "BT1-009", as: "stacked", under: ["BT1-001"] },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).canAttackUnsuspended(s.perm("host"))).toBe(false);
    expect(s.perm("host").attackablePermanentIds).not.toContain(s.perm("target").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    assertNoLoudGap(s);
  });

  it("does not grant the inherited permission to a non-Ice-Snow host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX11-007", as: "host", under: ["EX11-002"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    });
    await s.ready();

    expect(observe(s.engine).canAttackUnsuspended(s.perm("host"))).toBe(false);
    expect(s.perm("host").attackablePermanentIds).not.toContain(s.perm("target").permanentId);
    assertNoLoudGap(s);
  });

  it("treats having no opposing Digimon as satisfying Q6044", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX11-014", as: "host", under: ["EX11-002"] }] },
    });
    await s.ready();

    expect(observe(s.engine).canAttackUnsuspended(s.perm("host"))).toBe(true);
    assertNoLoudGap(s);
  });

  it("applies only on the inherited source controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX11-014", as: "host", under: ["EX11-002"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).canAttackUnsuspended(s.perm("host"))).toBe(false);

    s.state.turnSeat = 0;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).canAttackUnsuspended(s.perm("host"))).toBe(true);
    expect(s.perm("host").attackablePermanentIds).toContain(s.perm("target").permanentId);
    assertNoLoudGap(s);
  });

  it("recalculates the permission when the opponent gains or loses digivolution cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX11-014", as: "host", under: ["EX11-002"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "target", under: ["BT1-001"] }] },
    });
    await s.ready();
    expect(observe(s.engine).canAttackUnsuspended(s.perm("host"))).toBe(false);

    const [source] = s.perm("target").stack.splice(0, 1);
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).canAttackUnsuspended(s.perm("host"))).toBe(true);
    expect(s.perm("host").attackablePermanentIds).toContain(s.perm("target").permanentId);

    s.perm("target").stack.push(source!);
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).canAttackUnsuspended(s.perm("host"))).toBe(false);
    expect(s.perm("host").attackablePermanentIds).not.toContain(s.perm("target").permanentId);
    assertNoLoudGap(s);
  });
});
