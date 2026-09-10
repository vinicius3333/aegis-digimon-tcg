import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-039.js";
import "./EX1-042.js";

describe("EX1-042 Rosemon", () => {
  it("gets +1000 DP per suspended opposing Digimon, excluding own cards and non-Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX1-042", as: "rosemon", dp: 11000 },
          { card: "BT1-070", as: "ownSuspended", suspended: true },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-070", as: "opponentOne", suspended: true },
          { card: "BT1-073", as: "opponentTwo", suspended: true },
          { card: "BT1-076", as: "opponentUnsuspended" },
          { card: "BT1-088", as: "opponentTamer", suspended: true },
        ],
      },
    });
    await s.ready();
    expect(s.perm("rosemon").currentDP).toBe(13000);
  });

  it("counts zero suspended opposing Digimon and excludes a suspended ally", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX1-042", as: "rosemon", dp: 11000 },
          { card: "BT1-070", suspended: true },
        ],
      },
      1: { battleArea: [{ card: "BT1-076", as: "opponent" }] },
    });
    await s.ready();
    expect(s.perm("rosemon").currentDP).toBe(11000);
  });

  it("applies the scaling only during Rosemon's controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-042", as: "rosemon", dp: 11000 }] },
      1: { battleArea: [{ card: "BT1-070", as: "suspendedOpponent", suspended: true }] },
    });
    await s.ready();
    expect(s.perm("rosemon").currentDP).toBe(12000);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("rosemon").currentDP).toBe(11000);
  });

  it("suspends exactly one opposing unsuspended Digimon on attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX1-042", as: "rosemon" },
            { card: "BT1-070", as: "ownTarget" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-076", as: "alreadySuspended", suspended: true },
            { card: "BT1-070", as: "target" },
          ],
          security: ["BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("rosemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.perm("alreadySuspended").isSuspended).toBe(true);
    expect(s.perm("ownTarget").isSuspended).toBe(false);
  });

  it("keeps EX1-039's inherited watcher active beneath Rosemon and checks two security cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-042", as: "rosemon", under: ["EX1-039"] }] },
        1: {
          battleArea: [{ card: "BT1-070", as: "target" }],
          security: ["BT1-009", "BT1-010", "BT1-012"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(s.perm("rosemon").stack.map(({ cardId }) => cardId)).toEqual(["EX1-039"]);
    expect(observe(s.engine).keywordAmount(s.perm("rosemon"), "SecurityAttack")).toBe(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("rosemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended && s.state.players[1]!.security.length === 1);

    expect(observe(s.engine).keywordAmount(s.perm("rosemon"), "SecurityAttack")).toBe(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(2);
  });

  it("evolves legally from a green Lv.5 source and rejects a red source", async () => {
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "EX1-039", as: "greenSource" }],
        hand: [{ card: "EX1-042", as: "evo" }],
      },
    });
    legal.state.memory = 5;
    await legal.ready();
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("greenSource").permanentId,
        instanceId: legal.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("greenSource").topCard.cardId === "EX1-042");
    expect(legal.perm("greenSource").stack.map(({ cardId }) => cardId)).toEqual(["EX1-039"]);
    expect(legal.state.memory).toBe(2);
    expect(legal.state.players[0]!.hand).toHaveLength(0);

    const illegal = setupEngine({
      0: {
        battleArea: [{ card: "BT1-020", as: "redSource" }],
        hand: [{ card: "EX1-042", as: "evo" }],
      },
    });
    illegal.state.memory = 5;
    await illegal.ready();
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("redSource").permanentId,
        instanceId: illegal.inst("evo").instanceId,
      }),
    ).toMatchObject({ ok: false, reason: "invalid-evolution" });
    expect(illegal.perm("redSource").topCard.cardId).toBe("BT1-020");
    expect(illegal.perm("redSource").stack).toHaveLength(0);
    expect(illegal.state.memory).toBe(5);
    expect(illegal.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX1-042"]);
  });
});
