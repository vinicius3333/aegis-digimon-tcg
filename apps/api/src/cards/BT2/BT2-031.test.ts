import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT2-031.js";

describe("BT2-031 Vikemon", () => {
  it("gets +1000 DP and Security Attack +1 on its turn while the opponent has a source-less Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-031", as: "vikemon", under: ["BT2-027"] }] },
      1: { battleArea: [{ card: "BT1-010", as: "sourceLess" }] },
    });

    await s.engine.recomputeContinuousEffects();

    expect(s.perm("vikemon").currentDP).toBe(s.perm("vikemon").baseDP + 1000);
    expect(observe(s.engine).keywordAmount(s.perm("vikemon"), "SecurityAttack")).toBe(1);
  });

  it("does not gain either bonus when every opposing Digimon has a digivolution card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-031", as: "vikemon", under: ["BT2-027"] }] },
      1: { battleArea: [{ card: "BT2-024", under: ["BT2-022"] }] },
    });

    await s.engine.recomputeContinuousEffects();

    expect(s.perm("vikemon").currentDP).toBe(s.perm("vikemon").baseDP);
    expect(observe(s.engine).keywordAmount(s.perm("vikemon"), "SecurityAttack")).toBe(0);
  });

  it("does not count the controller's own source-less Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-031", as: "vikemon", under: ["BT2-027"] }, { card: "BT1-010" }] },
    });

    await s.engine.recomputeContinuousEffects();

    expect(s.perm("vikemon").currentDP).toBe(s.perm("vikemon").baseDP);
    expect(observe(s.engine).keywordAmount(s.perm("vikemon"), "SecurityAttack")).toBe(0);
  });

  it("does not gain either bonus during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-031", as: "vikemon", under: ["BT2-027"] }] },
      1: { battleArea: [{ card: "BT1-010" }] },
    });
    s.state.turnSeat = 1;

    await s.engine.recomputeContinuousEffects();

    expect(s.perm("vikemon").currentDP).toBe(s.perm("vikemon").baseDP);
    expect(observe(s.engine).keywordAmount(s.perm("vikemon"), "SecurityAttack")).toBe(0);
  });

  it("does not count a source-less Digimon in the opponent's breeding area", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-031", as: "vikemon", under: ["BT2-027"] }] },
      1: { breeding: "BT1-010" },
    });

    await s.engine.recomputeContinuousEffects();

    expect(s.perm("vikemon").currentDP).toBe(s.perm("vikemon").baseDP);
    expect(observe(s.engine).keywordAmount(s.perm("vikemon"), "SecurityAttack")).toBe(0);
  });

  it("proves the legal blue hatch-to-Vikemon stack, turn cycle, move, attack, and peer isolation", async () => {
    const deck = ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015"];
    const s = setupEngine({
      0: {
        eggDeck: [{ card: "BT2-002", as: "egg" }],
        hand: [
          { card: "BT2-022", as: "level3" },
          { card: "BT2-024", as: "level4" },
          { card: "BT2-027", as: "level5" },
          { card: "BT2-031", as: "vikemon" },
        ],
        deck,
      },
      1: {
        battleArea: [
          { card: "BT1-010", as: "sourceLessOpponent" },
          { card: "BT2-024", as: "stackedOpponent", under: ["BT2-022"] },
        ],
        security: ["BT1-010", "BT1-011"],
        deck,
      },
    });
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 0);
    s.state.memory = 10;
    const breedingPermanentId = s.state.players[0]!.breeding!.permanentId;

    for (const alias of ["level3", "level4", "level5", "vikemon"] as const) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: breedingPermanentId,
          instanceId: s.inst(alias).instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.state.pendingDecision === undefined &&
          s.state.players[0]!.breeding!.topCard.instanceId === s.inst(alias).instanceId,
      );
    }
    expect(s.state.players[0]!.breeding!.stack.map(({ cardId }) => cardId)).toEqual([
      "BT2-002",
      "BT2-022",
      "BT2-024",
      "BT2-027",
    ]);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 1);
    expect(observe(s.engine).keywordAmount(s.perm("stackedOpponent"), "SecurityAttack")).toBe(0);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: breedingPermanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 0);

    expect(s.perm("vikemon").currentDP).toBe(s.perm("vikemon").baseDP + 1000);
    expect(observe(s.engine).keywordAmount(s.perm("vikemon"), "SecurityAttack")).toBe(1);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: breedingPermanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("vikemon").isSuspended && s.state.pendingDecision === undefined);
    expect(s.state.players[1]!.security).toHaveLength(0);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
