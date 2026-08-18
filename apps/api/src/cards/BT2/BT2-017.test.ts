import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-017.js";

describe("BT2-017 WarGrowlmon", () => {
  it("deletes a 3000 DP Digimon with a red Tamer in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-085" }, { card: "BT2-013", as: "base" }],
          hand: [{ card: "BT2-017", as: "evolving" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 3000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("does not delete a 3000 DP Digimon without an allied red Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-086" }, { card: "BT2-013", as: "base" }],
          hand: [{ card: "BT2-017", as: "evolving" }],
        },
        1: { battleArea: [{ card: "BT1-010", dp: 3000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT2-017");
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("does not delete a 3001 DP Digimon even with a red Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-085" }, { card: "BT2-013", as: "base" }],
          hand: [{ card: "BT2-017", as: "evolving" }],
        },
        1: { battleArea: [{ card: "BT1-010", dp: 3001 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT2-017");
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("gives its host +1000 DP on its turn while the opponent has 5 cards in trash", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-020", as: "host", under: ["BT2-017"] }] },
      1: { trash: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005"] },
    });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1_000);
  });

  it("does not grant the inherited DP bonus with only 4 cards in the opponent's trash", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-020", as: "host", under: ["BT2-017"] }] },
      1: { trash: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"] },
    });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });

  it("does not grant the inherited DP bonus during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-020", as: "host", under: ["BT2-017"] }] },
      1: { trash: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005"] },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });
});
