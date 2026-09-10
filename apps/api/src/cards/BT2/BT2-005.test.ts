import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { settle } from "../../engine/testkit/harness.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT2-005.js";
import "./BT2-065.js";
import "./BT2-058.js";
import "../BT20/BT20-047.js";

describe("BT2-005 Kapurimon", () => {
  it("gives +1000 DP during its turn while its host has Reboot", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-065", as: "host", under: ["BT2-005"] }] } });
    await s.engine.recomputeContinuousEffects();
    // BT2-065 has Reboot as a top-level keyword, so Kapurimon's inherited buff is active.
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });

  it("does not give +1000 DP when its host lacks Reboot", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-062", as: "host", under: ["BT2-005"] }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });

  it("does not give +1000 DP during the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-065", as: "host", under: ["BT2-005"] }] } });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });

  it("survives a legal public hatch, two digivolutions, and move from breeding", async () => {
    const s = setupEngine({
      0: {
        eggDeck: [{ card: "BT2-005", as: "egg" }],
        hand: [
          { card: "BT20-047", as: "host" },
          { card: "BT2-058", as: "champion" },
        ],
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
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: breedingId, instanceId: s.inst("host").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT20-047");
    expect(s.state.players[0]!.breeding!.stack.map((card) => card.cardId)).toEqual(["BT2-005"]);
    // BT20-047's Reboot is inherited, so it is not active while Solarmon is the top card.
    await s.engine.recomputeContinuousEffects();
    expect(s.state.players[0]!.breeding!.currentDP).toBe(s.state.players[0]!.breeding!.baseDP);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: breedingId,
        instanceId: s.inst("champion").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT2-058");
    expect(s.state.players[0]!.breeding!.stack.map((card) => card.cardId)).toEqual(["BT2-005", "BT20-047"]);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: breedingId })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 0);
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT2-005", "BT20-047"]);
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("buffs only the host carrying Kapurimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-065", as: "host", under: ["BT2-005"] },
          { card: "BT2-065", as: "peer" },
        ],
      },
    });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
    expect(s.perm("peer").currentDP).toBe(s.perm("peer").baseDP);
  });
});
