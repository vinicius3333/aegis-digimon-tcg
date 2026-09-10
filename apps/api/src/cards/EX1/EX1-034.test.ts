import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../ST6/ST6-15.js";
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
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-080", as: "attacker" },
            { card: "BT1-070", as: "target", dp: 5000 },
          ],
          security: ["BT1-085", "BT1-085"],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-010"],
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
    // ownCandidate stays behind — only palmon is deleted, leaving the other Digimon in play.
    await settle(() => s.state.players[0]!.battleArea.length === 1 && s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.perm("ownCandidate").isSuspended).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not suspend an opposing Digimon above 5000 DP", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-034", as: "palmon" }], hand: ["BT1-009"], deck: ["BT1-009", "BT1-010"] },
        1: {
          battleArea: [
            { card: "BT1-080", as: "attacker" },
            { card: "BT1-070", as: "target", dp: 6000 },
          ],
          security: ["BT1-085", "BT1-085"],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-010"],
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
          deck: ["BT1-009", "BT1-010"],
          security: ["BT1-085", "BT1-085"],
        },
        1: {
          battleArea: [{ card: "BT1-080", as: "attacker" }],
          breeding: { card: "BT1-070", as: "breedingCandidate", dp: 5000 },
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-010"],
          security: ["BT1-085", "BT1-085"],
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
    await settle(() => s.state.phase === "Breeding" && s.state.turnSeat === 1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
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
    expect(s.perm("breedingCandidate").isSuspended).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("fires after a legally evolved Palmon is deleted through a public effect", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT1-007", as: "base" },
          hand: [{ card: "EX1-034", as: "evo" }],
          deck: ["BT1-009", "BT1-010"],
          security: ["BT1-085", "BT1-085"],
        },
        1: {
          battleArea: [
            { card: "ST6-03", as: "cost" },
            { card: "BT1-070", as: "target", dp: 5000 },
          ],
          hand: [{ card: "ST6-15", as: "option" }],
          deck: ["BT1-009", "BT1-010"],
          security: ["BT1-085", "BT1-085"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const permanentId = s.perm("base").permanentId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX1-034");
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT1-007"]);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.state.phase === "Breeding" && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "EX1-034")).toBe(true);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("rejects evolution from a non-green level-2 boundary without changing the source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "invalidSource" }],
        hand: [{ card: "EX1-034", as: "evo" }],
        deck: ["BT1-009"],
        security: ["BT1-009"],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("invalidSource").permanentId,
        instanceId: s.inst("evo").instanceId,
      }).ok,
    ).toBe(false);
    await settle();
    expect(s.perm("invalidSource").topCard.cardId).toBe("BT1-009");
    expect(s.perm("invalidSource").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX1-034"]);
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
