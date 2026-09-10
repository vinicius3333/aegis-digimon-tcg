import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT2-026.js";

describe("BT2-026 Veedramon", () => {
  it("gains Jamming during its turn while an allied blue Tamer is in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-026", as: "veedramon" },
          { card: "BT1-086", as: "tamer" },
        ],
      },
    });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("veedramon"), "Jamming")).toBe(true);
  });

  it("does not gain Jamming from a non-blue Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-026", as: "veedramon" },
          { card: "BT1-085", as: "tamer" },
        ],
      },
    });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("veedramon"), "Jamming")).toBe(false);
  });

  it("does not have Jamming during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-026", as: "veedramon" },
          { card: "BT1-086", as: "tamer" },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("veedramon"), "Jamming")).toBe(false);
  });

  it("survives battle against a higher-DP Security Digimon while Jamming is active", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-026", as: "veedramon" },
          { card: "BT1-086", as: "tamer" },
        ],
      },
      1: { security: ["BT1-080"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("veedramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("veedramon").permanentId),
    ).toBe(true);
  });

  it("is deleted by a higher-DP Security Digimon without a blue Tamer", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-026", as: "veedramon" }] },
      1: { security: ["BT1-080"] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("veedramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT2-026")).toBe(true);
  });

  it("proves a legal public hatch, evolution, move, and blue-Tamer Jamming lifecycle", async () => {
    const deck = ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"];
    const s = setupEngine({
      0: {
        eggDeck: [{ card: "BT1-003", as: "egg" }],
        hand: [
          { card: "BT1-030", as: "gomamon" },
          { card: "BT2-026", as: "veedramon" },
          { card: "BT1-086", as: "blueTamer" },
        ],
        deck,
      },
      1: { deck },
    });
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 0);
    s.state.memory = 6;
    const breedingId = s.state.players[0]!.breeding!.permanentId;
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: breedingId, instanceId: s.inst("gomamon").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT1-030");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: breedingId,
        instanceId: s.inst("veedramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT2-026");
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blueTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((card) => card.topCard.cardId === "BT1-086"));
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: breedingId })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 0);
    expect(s.perm("veedramon").stack.map((card) => card.cardId)).toEqual(["BT1-003", "BT1-030"]);
    expect(observe(s.engine).hasKeyword(s.perm("veedramon"), "Jamming")).toBe(true);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
