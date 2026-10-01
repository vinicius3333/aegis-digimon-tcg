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

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("ultimate").instanceId })).toEqual({
      ok: true,
    });
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
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rookie").instanceId })).toEqual({
      ok: true,
    });
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

describe("BT4-060 Lotosmon — KB Q&A rulings", () => {
  const lotosmon = { card: "BT4-060", as: "lotos", under: ["BT4-004", "BT4-052", "BT4-054", "BT4-059"] };

  it("suspends your own level 4 or lower Digimon when you play it (Q1216)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [lotosmon],
        hand: [
          { card: "BT1-009", as: "ownRookie" },
          { card: "BT1-023", as: "ownUltimate" },
        ],
      },
    });
    s.state.memory = 10;
    await s.engine.recomputeContinuousEffects();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ownRookie").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("ownRookie").isSuspended);
    expect(s.perm("ownRookie").isSuspended).toBe(true);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ownUltimate").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT1-023"), 5000);
    expect(s.perm("ownUltimate").isSuspended).toBe(false);
  });

  it("does not suspend a Digimon that digivolves into a level 4, because digivolving is not playing (Q1217)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [lotosmon, { card: "BT4-051", as: "base", under: ["BT4-004"] }],
        hand: [
          { card: "BT4-054", as: "evolving" },
          { card: "BT1-009", as: "played" },
        ],
      },
    });
    s.state.memory = 5;
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT4-054", 5000);
    expect(s.perm("base").topCard?.cardId).toBe("BT4-054");
    expect(s.perm("base").isSuspended).toBe(false);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("played").isSuspended);
    expect(s.perm("played").isSuspended).toBe(true);
    expect(s.perm("base").isSuspended).toBe(false);
  });

  it("does not suspend a level 4 Digimon moved from the breeding area, because moving is not playing (Q1218)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [lotosmon],
        breeding: { card: "BT1-019", as: "mover" },
        hand: [{ card: "BT1-009", as: "played" }],
      },
    });
    s.state.phase = Phase.Breeding;
    await s.engine.recomputeContinuousEffects();

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("mover").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding === undefined, 5000);
    expect(s.state.players[0]!.battleArea.map((p) => p.permanentId)).toContain(s.perm("mover").permanentId);
    expect(s.perm("mover").isSuspended).toBe(false);

    s.state.phase = Phase.Main;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("played").isSuspended);
    expect(s.perm("played").isSuspended).toBe(true);
    expect(s.perm("mover").isSuspended).toBe(false);
  });
});
