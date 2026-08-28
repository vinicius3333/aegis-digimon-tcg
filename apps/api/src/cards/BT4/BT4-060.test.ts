import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-060.js";

describe("BT4-060 Lotosmon", () => {
  it("suspends a level 4 or lower Digimon played by either player", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-060", as: "lotos", under: ["BT4-004", "BT4-052", "BT4-054", "BT4-059"] }] },
      1: { hand: [{ card: "BT1-009", as: "rookie" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 4;
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("rookie").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT1-009" && p.isSuspended));

    expect(s.state.players[1]!.battleArea.find((p) => p.topCard?.cardId === "BT1-009")?.isSuspended).toBe(true);
  });

  it("does not suspend a level 5 Digimon when it is played", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-060", as: "lotos", under: ["BT4-004", "BT4-052", "BT4-054", "BT4-059"] }] },
      1: { hand: [{ card: "BT1-023", as: "ultimate" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 6;
    await s.engine.recomputeContinuousEffects();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("ultimate").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT1-023"), 5000);

    expect(s.state.players[1]!.battleArea.find((p) => p.topCard?.cardId === "BT1-023")?.isSuspended).toBe(false);
  });

  it("also suspends a level 4 or lower Digimon played by its controller", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT4-060", as: "lotos", under: ["BT4-004", "BT4-052", "BT4-054", "BT4-059"] }],
        hand: [{ card: "BT1-009", as: "rookie" }],
      },
    });
    s.state.memory = 4;
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rookie").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("rookie").isSuspended);

    expect(s.perm("rookie").isSuspended).toBe(true);
  });

  it("does not treat digivolving into a level 4 as playing it", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT4-060", as: "lotos", under: ["BT4-004", "BT4-052", "BT4-054", "BT4-059"] },
          { card: "BT4-051", as: "base", under: ["BT4-004"] },
        ],
        hand: [{ card: "BT4-054", as: "evolving" }],
      },
    });
    s.state.memory = 2;
    await s.engine.recomputeContinuousEffects();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT4-054");

    expect(s.perm("base").isSuspended).toBe(false);
  });

  it("does not treat moving from breeding into battle as playing a level 4", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT4-060", as: "lotos", under: ["BT4-004", "BT4-052", "BT4-054", "BT4-059"] }],
        breeding: { card: "BT1-019", as: "mover" },
      },
    });
    s.state.phase = Phase.Breeding;
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("mover").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding === undefined);

    expect(s.perm("mover").isSuspended).toBe(false);
  });
});
