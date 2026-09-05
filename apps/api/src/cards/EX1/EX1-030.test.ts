import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT6/BT6-017.js";
import "../BT6/BT6-033.js";
import "../BT1/BT1-087.js";
import "./EX1-030.js";

describe("EX1-030 Angewomon", () => {
  it("gives an opposing Digimon and all opposing Security Digimon -3000 DP on attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-030", as: "angewomon" }], security: ["BT1-001", "BT1-001", "BT1-001"] },
        1: {
          battleArea: [{ card: "BT1-009", as: "target", dp: 5000 }],
          security: [{ card: "BT1-009", as: "securityDigimon" }, "BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("angewomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 2000 && observe(s.engine).securityDp(1) === -3000, 5000);
    expect(s.perm("target").currentDP).toBe(2000);
    expect(observe(s.engine).securityDp(1)).toBe(-3000);
  });

  it("does not activate the attack reduction below three security", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-030", as: "angewomon" }], security: ["BT1-001", "BT1-001"] },
      1: { battleArea: [{ card: "BT1-010", as: "target", dp: 5000 }], security: ["BT1-001"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("angewomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("angewomon").isSuspended);
    expect(s.perm("target").currentDP).toBe(5000);
    expect(observe(s.engine).securityDp(1)).toBe(0);
  });

  it("expires the attack reduction at the end of the attacking turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-030", as: "angewomon" }],
        security: ["BT1-001", "BT1-001", "BT1-001"],
        hand: ["BT1-009"],
        deck: ["BT1-001", "BT1-001"],
      },
      1: {
        battleArea: [{ card: "BT1-010", as: "target", dp: 11000, suspended: true }],
        security: ["BT1-001", "BT1-001"],
        hand: ["BT1-009"],
        deck: ["BT1-001", "BT1-001"],
      },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("angewomon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 8000);
    expect(s.perm("target").currentDP).toBe(8000);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(s.perm("target").currentDP).toBe(11000);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("gives an opposing Digimon -2000 DP once when public Recovery adds security", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-031", as: "host", under: ["EX1-030"] }],
          hand: [
            { card: "BT1-087", as: "firstTakeru" },
            { card: "BT1-087", as: "secondTakeru" },
          ],
          security: ["BT1-009", { card: "BT1-087", as: "firstChoice" }, { card: "BT1-087", as: "secondChoice" }],
          deck: ["BT1-001", "BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 5000 }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("firstChoice").instanceId);
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstTakeru").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 3000 && s.state.pendingDecision === undefined);
    expect(s.perm("target").currentDP).toBe(3000);
    preferred.splice(0, preferred.length, s.inst("secondChoice").instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondTakeru").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.hand.length === 0);
    expect(s.perm("target").currentDP).toBe(3000);
  });

  it("keeps the Security Digimon reduction for a later Security Attack +1", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX1-030", as: "angewomon" },
          { card: "BT6-017", as: "magna" },
        ],
        security: ["BT1-001", "BT1-001", "BT1-001"],
      },
      1: {
        battleArea: [{ card: "BT1-010", as: "firstTarget", suspended: true, dp: 5000 }],
        security: ["BT1-001", "BT11-072"],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("angewomon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("firstTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && observe(s.engine).securityDp(1) === -3000);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("magna").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT11-072")).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("magna").permanentId),
    ).toBe(true);
  });

  it("keeps the reduction after your security falls below three", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-030", as: "angewomon" }],
          hand: [{ card: "BT6-033", as: "pulse" }],
          security: ["BT1-001", "BT1-001", "BT1-001", "BT1-001"],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 5000 }], security: ["BT1-001"] },
      },
      { autoChooseOption: true, preferOptionIndex: 2 },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("angewomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 2000);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pulse").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 2);
    expect(s.perm("target").currentDP).toBe(2000);
    expect(observe(s.engine).securityDp(1)).toBe(-3000);
  });
});
