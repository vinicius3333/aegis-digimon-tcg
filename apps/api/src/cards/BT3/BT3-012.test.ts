import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-012.js";
import "./BT3-009.js";
import "./BT3-015.js";

describe("BT3-012 Aquilamon", () => {
  it("selects exactly one opposing Digimon with 2000 DP or less", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT3-015", as: "host", under: ["BT3-012"] }] },
      1: {
        battleArea: [
          { card: "BT1-010", as: "eligible" },
          { card: "BT1-011", as: "otherEligible" },
          { card: "BT1-009", as: "tooLarge" },
        ],
        security: ["BT1-011"],
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
      expect.arrayContaining([s.perm("eligible").permanentId, s.perm("otherEligible").permanentId]),
    );
    expect(request.options!.candidateInstanceIds).toHaveLength(2);
    expect(request.options!.candidateInstanceIds).not.toContain(s.perm("tooLarge").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("eligible").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 2, 5000);

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("otherEligible").permanentId)).toBe(
      true,
    );
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("tooLarge").permanentId)).toBe(true);
  });

  it("uses its inherited effect after a legal public red lifecycle", async () => {
    const deck = ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015"];
    const s = setupEngine({
      0: {
        eggDeck: ["BT3-001"],
        hand: [
          { card: "BT3-009", as: "level3" },
          { card: "BT3-012", as: "aquilamon" },
          { card: "BT3-015", as: "host" },
        ],
        deck,
      },
      1: {
        battleArea: [
          { card: "BT1-010", as: "exact2000" },
          { card: "BT1-009", as: "above2000" },
        ],
        security: ["BT1-011"],
        deck,
      },
    });
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 0);
    const permanentId = s.state.players[0]!.breeding!.permanentId;
    s.state.memory = 10;
    for (const alias of ["level3", "aquilamon", "host"] as const) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId,
          instanceId: s.inst(alias).instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision === undefined);
    }
    expect(s.state.players[0]!.breeding!.stack.map((card) => card.cardId)).toEqual(["BT3-001", "BT3-009", "BT3-012"]);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.every((permanent) => permanent.topCard.cardId !== "BT1-010"));
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-009")).toBe(true);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
