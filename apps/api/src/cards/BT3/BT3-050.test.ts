import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT3-050.js";

describe("BT3-050 Stingmon", () => {
  it("gains 1 memory when its host deletes an opposing Digimon in battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT3-052", dp: 7000, as: "host", under: ["BT3-050"] }] },
      1: { battleArea: [{ card: "BT1-010", dp: 1000, suspended: true, as: "defender" }] },
    });
    s.state.memory = 0;
    const defenderId = s.perm("defender").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: defenderId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => !s.state.players[1]!.battleArea.some((p) => p.permanentId === defenderId) && s.state.memory === 1,
      5000,
    );

    expect(s.state.memory).toBe(1);
  });

  it("does not gain memory when the host deletes an opposing Digimon but does not survive", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT3-052", dp: 7000, as: "host", under: ["BT3-050"] }] },
      1: { battleArea: [{ card: "BT1-010", dp: 7000, suspended: true, as: "defender" }] },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 0,
      5000,
    );

    expect(s.state.memory).toBe(0);
  });

  it("gains memory only once across two surviving deletions in one turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT3-052", dp: 7000, as: "host", under: ["BT3-050"] }],
        deck: Array(8).fill("BT1-009"),
      },
      1: {
        battleArea: [
          { card: "BT1-010", dp: 1000, suspended: true, as: "first" },
          { card: "BT1-011", dp: 1000, suspended: true, as: "second" },
        ],
        deck: Array(8).fill("BT1-009"),
      },
    });
    s.state.memory = 0;
    const hostId = s.perm("host").permanentId;
    const firstId = s.perm("first").permanentId;
    const secondId = s.perm("second").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: firstId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => !s.state.players[1]!.battleArea.some((p) => p.permanentId === firstId) && !observe(s.engine).isAttacking(),
    );
    expect(s.state.memory).toBe(1);

    await advance(s.engine).verb.unsuspend([hostId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: secondId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === secondId));

    expect(s.state.memory).toBe(1);
  });

  it("resets its once-per-turn gain on the next own turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT3-052", dp: 7000, as: "host", under: ["BT3-050"] }],
        deck: Array(8).fill("BT1-009"),
        hand: [{ card: "BT1-009", as: "spare" }],
      },
      1: {
        battleArea: [
          { card: "BT1-010", dp: 1000, suspended: true, as: "first" },
          { card: "BT1-011", dp: 1000, suspended: true, as: "second" },
        ],
        deck: Array(8).fill("BT1-009"),
      },
    });
    s.state.memory = 0;
    const hostId = s.perm("host").permanentId;
    const firstId = s.perm("first").permanentId;
    const secondId = s.perm("second").permanentId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: firstId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => !s.state.players[1]!.battleArea.some((p) => p.permanentId === firstId) && !observe(s.engine).isAttacking(),
    );
    expect(s.state.memory).toBe(6);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    // The real next own Active phase unsuspends the same host before Main Phase begins.
    expect(s.perm("host").isSuspended).toBe(false);
    await advance(s.engine).verb.suspend([secondId]);
    expect(s.perm("second").isSuspended).toBe(true);
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: secondId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => !s.state.players[1]!.battleArea.some((p) => p.permanentId === secondId) && !observe(s.engine).isAttacking(),
    );
    expect(s.state.memory).toBe(6);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
