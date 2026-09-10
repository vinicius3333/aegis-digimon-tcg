import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { settle } from "../../engine/testkit/harness.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT2-006.js";

describe("BT2-006 Tsumemon", () => {
  it("Q995 gives +2000 DP while another Digimon has the evolved host's name", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-055", as: "host", under: ["BT2-006"] },
          { card: "BT2-055", as: "other" },
        ],
      },
    });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 2000);
  });

  it("does not give +2000 DP for a differently named allied Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-055", as: "host", under: ["BT2-006"] },
          { card: "BT2-052", as: "different" },
        ],
      },
    });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });

  it("does not count an opponent's Digimon with the same name", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-055", as: "host", under: ["BT2-006"] }] },
      1: { battleArea: ["BT2-055"] },
    });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });

  it("does not give +2000 DP during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-055", as: "host", under: ["BT2-006"] }, "BT2-055"] },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });

  it("survives a legal public hatch, digivolve, and move from breeding", async () => {
    const s = setupEngine({
      0: {
        eggDeck: [{ card: "BT2-006", as: "egg" }],
        hand: [{ card: "BT2-055", as: "host" }],
        deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015"],
        battleArea: [],
      },
      1: { deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015"] },
    });
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 0);
    const breedingId = s.state.players[0]!.breeding!.permanentId;
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: breedingId, instanceId: s.inst("host").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT2-055");
    expect(s.state.players[0]!.breeding!.stack.map((card) => card.cardId)).toEqual(["BT2-006"]);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: breedingId })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 0);
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT2-006"]);
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("buffs the evolved host only when a same-named peer exists", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-055", as: "host", under: ["BT2-006"] },
          { card: "BT2-055", as: "peer" },
        ],
      },
    });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 2000);
    expect(s.perm("peer").currentDP).toBe(s.perm("peer").baseDP);
  });
});
