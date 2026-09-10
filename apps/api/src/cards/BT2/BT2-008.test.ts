import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { settle } from "../../engine/testkit/harness.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT2-008.js";

describe("BT2-008 Yaamon", () => {
  it("gives +1000 DP during its turn at the 5-card own-trash threshold", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-067", as: "host", under: ["BT2-008"] }],
        trash: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
      },
    });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });

  it("does not give +1000 DP with only 4 cards in its owner's trash", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-067", as: "host", under: ["BT2-008"] }],
        trash: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
      },
    });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });

  it("does not count cards in the opponent's trash", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-067", as: "host", under: ["BT2-008"] }] },
      1: { trash: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"] },
    });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });

  it("does not give +1000 DP during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-067", as: "host", under: ["BT2-008"] }],
        trash: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
      },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });

  it("survives a legal public hatch, digivolve, and move from breeding", async () => {
    const s = setupEngine({
      0: {
        eggDeck: [{ card: "BT2-008", as: "egg" }],
        hand: [{ card: "BT2-067", as: "host" }],
        deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015"],
        battleArea: [],
        trash: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
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
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT2-067");
    expect(s.state.players[0]!.breeding!.stack.map((card) => card.cardId)).toEqual(["BT2-008"]);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: breedingId })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 0);
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT2-008"]);
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("buffs only the host carrying Yaamon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-067", as: "host", under: ["BT2-008"] },
          { card: "BT2-067", as: "peer" },
        ],
        trash: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
      },
    });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
    expect(s.perm("peer").currentDP).toBe(s.perm("peer").baseDP);
  });
});
