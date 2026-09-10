import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-043.js";

describe("BT2-043 Agumon", () => {
  it("gives its host +1000 DP during its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-045", as: "host", under: ["BT2-043"] }] } });

    await s.engine.recomputeContinuousEffects();

    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });

  it("does not give its host +1000 DP during the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-045", as: "host", under: ["BT2-043"] }] } });
    s.state.turnSeat = 1;

    await s.engine.recomputeContinuousEffects();

    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });

  it("does not apply the inherited effect while Agumon is the top card", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-043", as: "agumon" }] } });

    await s.engine.recomputeContinuousEffects();

    expect(s.perm("agumon").currentDP).toBe(s.perm("agumon").baseDP);
  });

  it("proves its inherited effect through a legal public hatch, evolution, turn cycle, and move", async () => {
    const deck = ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015"];
    const s = setupEngine(
      {
        0: {
          eggDeck: [{ card: "BT2-004", as: "egg" }],
          hand: [
            { card: "BT2-043", as: "agumon" },
            { card: "BT2-045", as: "host" },
          ],
          deck,
          battleArea: [{ card: "BT2-045", as: "plainPeer" }],
        },
        1: { deck },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 0);
    s.state.memory = 4;
    const breedingId = s.state.players[0]!.breeding!.permanentId;
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: breedingId, instanceId: s.inst("agumon").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT2-043");
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: breedingId, instanceId: s.inst("host").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT2-045");
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: breedingId })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 0);
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT2-004", "BT2-043"]);
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
    expect(s.perm("plainPeer").currentDP).toBe(s.perm("plainPeer").baseDP);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
