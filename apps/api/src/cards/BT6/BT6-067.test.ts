import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-067.js";
import "../P/P-194.js";

describe("BT6-067 Gankoomon", () => {
  it("deletes all opposing Digimon tied for lowest play cost", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT10-013", as: "base" }], hand: [{ card: "BT6-067", as: "evolving" }] },
        1: { battleArea: ["BT1-010", "BT1-011", "BT2-020"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea[0]?.topCard.cardId).toBe("BT2-020");
  });

  it("gains Security Attack +1 only while the opponent has an unsuspended Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT6-067", as: "gankoomon" }] },
      1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
    });
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("gankoomon"), "SecurityAttack")).toBe(1);

    s.perm("opponent").isSuspended = true;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).keywordAmount(s.perm("gankoomon"), "SecurityAttack")).toBe(0);
  });
});

describe("BT6-067 Gankoomon — KB Q&A rulings", () => {
  it("deletes every opposing Digimon tied for the lowest play cost and spares higher ones (Q1460)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT10-013", as: "base" }], hand: [{ card: "BT6-067", as: "evolving" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "lowestOne" },
            { card: "BT6-068", as: "lowestTwo" },
            { card: "P-194", as: "higher" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const lowestIds = [s.perm("lowestOne"), s.perm("lowestTwo")].map((permanent) => permanent.topCard.instanceId);
    const higherId = s.perm("higher").topCard.instanceId;
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(expect.arrayContaining(lowestIds));
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([higherId]);
  });

  it("loses Security Attack +1 as soon as the only unsuspended opposing Digimon suspends to block (Q1461)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT6-067", as: "attacker" }] },
      1: { battleArea: [{ card: "P-194", as: "blocker" }], security: 2 },
    });
    const attacker = s.perm("attacker");
    const blocker = s.perm("blocker");

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 1);
    expect(observe(s.engine).keywordAmount(attacker, "SecurityAttack")).toBe(1);

    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: blocker.permanentId })).toEqual({
      ok: true,
    });
    // The blocker's ＜Barrier＞ prompt pauses the battle while the suspended blocker is still in play.
    await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
    expect(blocker.isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea).toContain(blocker);
    expect(observe(s.engine).keywordAmount(attacker, "SecurityAttack")).toBe(0);

    expect(
      s.engine.applyIntent(1, { type: "respondBarrier", permanentId: blocker.permanentId, accept: false }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
  });
});
