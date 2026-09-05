import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-055.js";

describe("EX1-055 Tapirmon", () => {
  it("draws 1 when another one of your Digimon is deleted in a real battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX1-058", as: "host", under: ["EX1-055"] },
          { card: "BT1-009", as: "other", dp: 1000 },
        ],
        deck: ["BT1-010"],
      },
      1: {
        battleArea: [{ card: "BT1-010", as: "target", dp: 5000, suspended: true }],
        deck: ["BT1-009"],
        security: ["BT1-009"],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("other").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("other").instanceId));
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("draws only once for two simultaneous rule deletions (Q3240)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX1-058", as: "host", under: ["EX1-055"] },
          { card: "BT1-009", as: "first", dp: 0 },
          { card: "BT1-009", as: "second", dp: 0 },
        ],
        deck: ["BT1-010"],
      },
      1: {
        battleArea: [{ card: "BT1-009", as: "opponent" }],
        hand: ["BT1-009"],
        deck: ["BT1-009"],
        security: ["BT1-009"],
      },
    });
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === "Main" && s.state.turnSeat === 0);
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-009").length === 2 &&
        s.state.players[0]!.hand.length === 1,
    );
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-009")).toHaveLength(2);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not draw twice for separate deletions during one turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX1-058", as: "host", under: ["EX1-055"] },
          { card: "BT1-009", as: "first", dp: 1000 },
          { card: "BT1-009", as: "second", dp: 1000 },
        ],
        deck: ["BT1-010", "BT1-011"],
      },
      1: {
        battleArea: [
          { card: "BT1-010", as: "firstTarget", dp: 5000, suspended: true },
          { card: "BT1-010", as: "secondTarget", dp: 5000, suspended: true },
        ],
        security: ["BT1-009", "BT1-009"],
      },
    });
    await s.ready();
    for (const [attacker, target] of [
      ["first", "firstTarget"],
      ["second", "secondTarget"],
    ] as const) {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm(attacker).permanentId,
          target: { kind: "permanent", permanentId: s.perm(target).permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst(attacker).instanceId));
    }
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("does not draw from a deletion during the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX1-058", as: "host", under: ["EX1-055"] },
            { card: "BT1-009", as: "victim", dp: 5000 },
          ],
          hand: ["BT1-009"],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "target", dp: 1000, suspended: true },
            { card: "BT1-011", as: "attacker", dp: 6000 },
          ],
          hand: ["BT1-009"],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === "Main" && s.state.turnSeat === 0);
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("victim").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("victim").isSuspended &&
        !s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === s.inst("target").instanceId),
    );
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === "Main" && s.state.turnSeat === 1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("victim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("victim").instanceId));
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not draw when the host carrying Tapirmon is deleted", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-058", as: "host", under: ["EX1-055"], dp: 1000 }],
        deck: ["BT1-009"],
      },
      1: {
        battleArea: [{ card: "BT1-010", as: "target", dp: 5000, suspended: true }],
        deck: ["BT1-009"],
      },
    });
    await s.ready();
    const hostId = s.perm("host").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "EX1-058"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(false);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });
});
