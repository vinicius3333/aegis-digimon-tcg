import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-046.js";

describe("EX1-046 Kurisarimon", () => {
  it("unsuspends its host when an own same-name Digimon loses a real battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          // EX1-046 is a legal Lv.4 source under the Lv.5 Infermon host.
          { card: "EX1-051", as: "host", suspended: true, under: ["EX1-046"] },
          { card: "BT2-062", as: "sameName" },
        ],
      },
      1: { battleArea: [{ card: "BT1-070", as: "winner", suspended: true, dp: 7000 }] },
    });
    await s.ready();
    const sameNameId = s.perm("sameName").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("sameName").permanentId,
        target: { kind: "permanent", permanentId: s.perm("winner").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.permanentId === sameNameId));
    expect(s.perm("host").isSuspended).toBe(false);
  });

  it("does not unsuspend when an own Digimon with a different name is deleted", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX1-051", as: "host", suspended: true, under: ["EX1-046"] },
          { card: "BT2-059", as: "differentName" },
        ],
      },
      1: { battleArea: [{ card: "BT1-070", as: "winner", suspended: true, dp: 7000 }] },
    });
    await s.ready();
    const differentNameId = s.perm("differentName").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("differentName").permanentId,
        target: { kind: "permanent", permanentId: s.perm("winner").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.permanentId === differentNameId));
    expect(s.perm("host").isSuspended).toBe(true);
  });

  it("does not unsuspend when an opposing same-name Digimon is deleted", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX1-051", as: "host", suspended: true, under: ["EX1-046"] },
          { card: "BT1-009", as: "attacker", dp: 10000 },
        ],
      },
      1: { battleArea: [{ card: "BT2-062", as: "opponentSameName", suspended: true, dp: 4000 }] },
    });
    await s.ready();
    const opponentSameNameId = s.perm("opponentSameName").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("opponentSameName").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === opponentSameNameId));
    expect(s.perm("host").isSuspended).toBe(true);
  });

  it("unsuspends at most once per turn across two own same-name deletions", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX1-051", as: "host", suspended: true, under: ["EX1-046"] },
          { card: "BT2-062", as: "same1" },
          { card: "BT5-067", as: "same2" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-070", as: "firstWinner", suspended: true, dp: 7000 },
          { card: "BT1-070", as: "hostTarget", suspended: true, dp: 1000 },
          { card: "BT1-070", as: "secondWinner", suspended: true, dp: 7000 },
        ],
      },
    });
    await s.ready();
    const same1Id = s.perm("same1").permanentId;
    const same2Id = s.perm("same2").permanentId;
    const hostTargetId = s.perm("hostTarget").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("same1").permanentId,
        target: { kind: "permanent", permanentId: s.perm("firstWinner").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => !s.state.players[0]!.battleArea.some((p) => p.permanentId === same1Id) && !s.perm("host").isSuspended,
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: hostTargetId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => !s.state.players[1]!.battleArea.some((p) => p.permanentId === hostTargetId) && s.perm("host").isSuspended,
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("same2").permanentId,
        target: { kind: "permanent", permanentId: s.perm("secondWinner").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.permanentId === same2Id));
    expect(s.perm("host").isSuspended).toBe(true);
  });

  it("resets its once-per-turn trigger on the next own turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX1-051", as: "host", suspended: true, under: ["EX1-046"] },
          { card: "BT2-062", as: "same1" },
          { card: "BT5-067", as: "same2" },
          { card: "BT2-062", as: "same3" },
        ],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        security: ["BT1-009", "BT1-010"],
      },
      1: {
        battleArea: [
          { card: "BT1-070", as: "firstWinner", suspended: true, dp: 7000 },
          { card: "BT1-070", as: "hostTarget", suspended: true, dp: 1000 },
          { card: "BT1-070", as: "secondWinner", suspended: true, dp: 7000 },
          { card: "BT1-070", as: "thirdWinner", suspended: true, dp: 7000 },
        ],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
      },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("same1").permanentId,
        target: { kind: "permanent", permanentId: s.perm("firstWinner").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("host").isSuspended);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("hostTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("same2").permanentId,
        target: { kind: "permanent", permanentId: s.perm("secondWinner").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT5-067"));
    expect(s.perm("host").isSuspended).toBe(true);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("thirdWinner").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("thirdWinner").isSuspended);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("same3").permanentId,
        target: { kind: "permanent", permanentId: s.perm("thirdWinner").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("host").isSuspended);
    expect(s.perm("host").isSuspended).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
