import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-034.js";

describe("EX1-034 Palmon", () => {
  it("suspends an opposing Digimon with 5000 DP or less on deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX1-034", as: "palmon" },
            { card: "BT1-070", as: "ownCandidate", dp: 5000 },
          ],
          hand: ["BT1-009"],
          deck: ["BT1-001", "BT1-001"],
        },
        1: {
          battleArea: [
            { card: "BT1-080", as: "attacker" },
            { card: "BT1-070", as: "target", dp: 5000 },
          ],
          security: ["BT1-001", "BT1-001"],
          hand: ["BT1-009"],
          deck: ["BT1-001", "BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("palmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("palmon").isSuspended);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("palmon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.perm("ownCandidate").isSuspended).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not suspend an opposing Digimon above 5000 DP", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-034", as: "palmon" }], hand: ["BT1-009"], deck: ["BT1-001", "BT1-001"] },
        1: {
          battleArea: [
            { card: "BT1-080", as: "attacker" },
            { card: "BT1-070", as: "target", dp: 6000 },
          ],
          security: ["BT1-001", "BT1-001"],
          hand: ["BT1-009"],
          deck: ["BT1-001", "BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("palmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("palmon").isSuspended);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("palmon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.pendingDecision === undefined);
    expect(s.perm("target").isSuspended).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not select an own Digimon when no eligible opposing target exists", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX1-034", as: "palmon" },
            { card: "BT1-070", as: "ownCandidate", dp: 5000 },
          ],
          hand: ["BT1-009"],
          deck: ["BT1-001", "BT1-002"],
          security: ["BT1-001", "BT1-001"],
        },
        1: {
          battleArea: [{ card: "BT1-080", as: "attacker" }],
          hand: ["BT1-009"],
          deck: ["BT1-001", "BT1-002"],
          security: ["BT1-001", "BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("palmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("palmon").isSuspended);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("palmon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1 && s.state.pendingDecision === undefined);
    expect(s.perm("ownCandidate").isSuspended).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
