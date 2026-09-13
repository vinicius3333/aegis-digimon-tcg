import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-134.js";

describe("P-134 Shoemon", () => {
  it("gives one opposing Digimon Security Attack -1 on play", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "P-134", as: "shoemon" }] },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shoemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      (
        s.engine as unknown as { continuous: { hasKeyword(id: string, keyword: string): boolean } }
      ).continuous.hasKeyword(s.perm("target").permanentId, "SecurityAttack"),
    );
    expect(
      (
        s.engine as unknown as { continuous: { hasKeyword(id: string, keyword: string): boolean } }
      ).continuous.hasKeyword(s.perm("target").permanentId, "SecurityAttack"),
    ).toBe(true);
    assertNoLoudGap(s);
  });

  it("reduces one opposing Digimon by 2000 through the inherited attack effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-051", as: "host", under: ["P-134"] }] },
      1: { battleArea: [{ card: "BT1-010", dp: 7000, suspended: true, as: "target" }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 5000);
    expect(s.perm("target").currentDP).toBe(5000);
    assertNoLoudGap(s);
  });

  it("denies a second inherited trigger in one turn and resets on the next natural turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-051", as: "host", under: ["P-134"] }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-010", dp: 7000, as: "target" }],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-090", "BT1-090", "BT1-090"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    const attack = async () => {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("host").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking());
    };

    await attack();
    expect(s.perm("target").currentDP).toBe(5000);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.turnSeat).toBe(0);
    await attack();
    expect(s.perm("target").currentDP).toBe(5000);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("target").currentDP).toBe(7000);
    await attack();
    expect(s.perm("target").currentDP).toBe(5000);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
