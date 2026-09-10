import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-016.js";

describe("EX1-016 Ikkakumon", () => {
  it("can attack an unsuspended opposing Digimon with no digivolution cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-016", as: "ikkakumon" }] },
      1: { battleArea: [{ card: "BT1-009", as: "eligible" }] },
    });
    await s.ready();
    expect(observe(s.engine).canAttackUnsuspended(s.perm("ikkakumon"))).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ikkakumon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("eligible").permanentId },
      }),
    ).toEqual({ ok: true });
  });

  it("can't use that permission against an unsuspended Digimon with digivolution cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-016", as: "ikkakumon" }] },
      1: { battleArea: [{ card: "BT1-032", as: "ineligible", under: ["EX1-013"] }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ikkakumon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("ineligible").permanentId },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });

  it("does not grant the permission during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-016", as: "ikkakumon" }], hand: ["BT1-009"], deck: ["BT1-009"] },
      1: { battleArea: [{ card: "BT1-009", as: "eligible" }], hand: ["BT1-009"], deck: ["BT1-009"] },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).canAttackUnsuspended(s.perm("ikkakumon"))).toBe(true);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(observe(s.engine).canAttackUnsuspended(s.perm("ikkakumon"))).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ikkakumon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("eligible").permanentId },
      }),
    ).toEqual({ ok: false, reason: "not-your-turn" });
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("cannot use the permission against a suspended Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-016", as: "ikkakumon" }] },
      1: { battleArea: [{ card: "BT1-032", as: "suspended", suspended: true, under: ["EX1-013"] }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ikkakumon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("suspended").permanentId },
      }),
    ).toEqual({ ok: true });
  });

  it("does not target its controller's Digimon or a Digimon in the breeding area", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX1-016", as: "ikkakumon" },
          { card: "BT1-009", as: "ownTarget" },
        ],
      },
      1: {
        battleArea: [{ card: "BT1-009", as: "opponentTarget" }],
        breeding: { card: "BT1-032", as: "raised", under: ["EX1-013"] },
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ikkakumon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("ownTarget").permanentId },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ikkakumon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("raised").permanentId },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ikkakumon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("opponentTarget").permanentId },
      }),
    ).toEqual({ ok: true });
  });

  it("digivolves legally from a blue level-3 source and preserves the source stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-013", as: "source" }],
        hand: [{ card: "EX1-016", as: "evo" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "EX1-016");

    expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual(["EX1-013"]);
    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
  });

  it("rejects evolution from a non-blue level-3 source without changing the stack or memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "invalidSource" }],
        hand: [{ card: "EX1-016", as: "evo" }],
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("invalidSource").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toMatchObject({ ok: false, reason: "invalid-evolution" });

    expect(s.perm("invalidSource").topCard.cardId).toBe("BT1-009");
    expect(s.perm("invalidSource").stack).toHaveLength(0);
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX1-016"]);
  });
});
