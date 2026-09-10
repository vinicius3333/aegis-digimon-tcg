import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-073.js";

describe("BT2-073 Garurumon", () => {
  it("gains 1 memory when another own Digimon is deleted", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-075", as: "host", under: ["BT2-073"] },
          { card: "BT2-068", as: "other" },
        ],
      },
    });
    s.state.memory = 0;
    await advance(s.engine).verb.deletePermanent([s.perm("other").permanentId]);
    expect(s.state.memory).toBe(1);
  });

  it("Q1026 gains only 1 memory when two other Digimon are deleted together", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-075", as: "host", under: ["BT2-073"] },
          { card: "BT2-068", as: "first" },
          { card: "BT2-070", as: "second" },
        ],
      },
    });
    s.state.memory = 0;
    await advance(s.engine).verb.deletePermanent([s.perm("first").permanentId, s.perm("second").permanentId]);
    expect(s.state.memory).toBe(1);
  });

  it("gains only 1 memory across separate deletion timings in the same turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-075", as: "host", under: ["BT2-073"] },
          { card: "BT2-068", as: "first" },
          { card: "BT2-070", as: "second" },
        ],
      },
    });
    s.state.memory = 0;

    await advance(s.engine).verb.deletePermanent([s.perm("first").permanentId]);
    expect(s.state.memory).toBe(1);
    await advance(s.engine).verb.deletePermanent([s.perm("second").permanentId]);

    expect(s.state.memory).toBe(1);
  });

  it("does not trigger when an opponent's Digimon is deleted", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-075", as: "host", under: ["BT2-073"] }] },
      1: { battleArea: [{ card: "BT2-068", as: "opponent" }] },
    });
    s.state.memory = 0;

    await advance(s.engine).verb.deletePermanent([s.perm("opponent").permanentId]);

    expect(s.state.memory).toBe(0);
  });

  it("does not trigger during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-075", as: "host", under: ["BT2-073"] },
          { card: "BT2-068", as: "other" },
        ],
      },
    });
    s.state.turnSeat = 1;
    s.state.memory = 0;

    await advance(s.engine).verb.deletePermanent([s.perm("other").permanentId]);

    expect(s.state.memory).toBe(0);
  });

  it("does not activate while Garurumon is the top card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-073", as: "garurumon" },
          { card: "BT2-068", as: "other" },
        ],
      },
    });
    s.state.memory = 0;

    await advance(s.engine).verb.deletePermanent([s.perm("other").permanentId]);

    expect(s.state.memory).toBe(0);
  });

  it("proves the legal purple stack and public other-Digimon battle deletion", async () => {
    const deck = ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015"];
    const s = setupEngine({
      0: {
        eggDeck: [{ card: "BT2-007", as: "egg" }],
        hand: [
          { card: "BT2-069", as: "level3" },
          { card: "BT2-073", as: "garurumon" },
          { card: "BT2-075", as: "host" },
        ],
        battleArea: [{ card: "BT2-068", as: "other" }],
        security: ["BT1-010"],
        deck,
      },
      1: { battleArea: [{ card: "BT2-083", as: "opponent" }], deck },
    });
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 0);
    s.state.memory = 10;
    const breedingPermanentId = s.state.players[0]!.breeding!.permanentId;
    for (const alias of ["level3", "garurumon", "host"] as const) {
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
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("opponent").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("opponent").isSuspended && s.state.pendingDecision === undefined);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: breedingPermanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 0);
    s.state.memory = 0;
    const otherPermanentId = s.perm("other").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: otherPermanentId,
        target: { kind: "permanent", permanentId: s.perm("opponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.every(({ permanentId }) => permanentId !== otherPermanentId));
    expect(s.state.memory).toBe(1);
    expect(s.perm("host").stack.some(({ cardId }) => cardId === "BT2-073")).toBe(true);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
