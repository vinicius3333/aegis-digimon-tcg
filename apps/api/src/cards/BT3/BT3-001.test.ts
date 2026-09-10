import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-001.js";

describe("BT3-001 Poromon", () => {
  it("inherited When Attacking deletes exactly one opposing Digimon with 1000 DP or less", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-016", as: "host", under: ["BT3-001"] },
          { card: "BT1-011", as: "ownLowDp" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-011", as: "first" },
          { card: "BT1-011", as: "second" },
          { card: "BT1-010", as: "tooLarge" },
        ],
        security: ["BT1-012"],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === decision.decisionId)!.req;
    expect(request.options!.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("first").permanentId, s.perm("second").permanentId]),
    );
    expect(request.options!.candidateInstanceIds).toHaveLength(2);
    expect(request.options!.candidateInstanceIds).not.toContain(s.perm("ownLowDp").permanentId);
    expect(request.options!.candidateInstanceIds).not.toContain(s.perm("tooLarge").permanentId);

    const deletedInstanceId = s.perm("second").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("second").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === deletedInstanceId), 5000);

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("first").permanentId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("tooLarge").permanentId)).toBe(true);
  });

  it("does nothing when the opponent has no Digimon with 1000 DP or less", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-016", as: "host", under: ["BT3-001"] }] },
      1: { battleArea: [{ card: "BT1-010", as: "target" }], security: ["BT1-012"] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0, 5000);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("proves a legal red hatch, evolution, move, attack, and 1000-DP boundary", async () => {
    const deck = ["BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010"];
    const s = setupEngine({
      0: {
        eggDeck: [{ card: "BT3-001", as: "egg" }],
        hand: [
          { card: "BT3-007", as: "level3" },
          { card: "BT1-016", as: "host" },
        ],
        battleArea: [{ card: "BT1-011", as: "ownPeer" }],
        deck,
      },
      1: {
        battleArea: [
          { card: "BT1-011", as: "validTarget" },
          { card: "BT1-010", as: "tooLarge" },
        ],
        security: ["BT1-012"],
        deck,
      },
    });
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 0);
    const breedingId = s.state.players[0]!.breeding!.permanentId;
    s.state.memory = 6;
    for (const alias of ["level3", "host"] as const) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: breedingId,
          instanceId: s.inst(alias).instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision === undefined);
    }
    expect(s.state.players[0]!.breeding!.topCard.cardId).toBe("BT1-016");
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: breedingId })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 0);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT3-001", "BT3-007"]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: breedingId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.every((permanent) => permanent.topCard.cardId !== "BT1-011"));
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-010")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-011")).toBe(true);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
