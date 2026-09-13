import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-188.js";

describe("P-188 DemiVeemon", () => {
  it("draws once per turn when one of your blue Tamers is played", () => {
    expect(runtimeCompiledCard("P-188")!.effects.find((effect) => effect.trigger === "YourTurn")).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          event: "whenPlayed",
          sourceFilter: { controller: "mine", kind: ["Tamer"], colors: ["Blue"] },
          actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
        },
      ],
    });
  });

  it("draws when a blue Tamer is played under its live host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-029", as: "host", under: ["P-188"] }],
          hand: [
            { card: "BT11-090", as: "tamer1" },
            { card: "BT11-090", as: "tamer2" },
            { card: "BT11-090", as: "tamer3" },
          ],
          deck: [
            { card: "BT1-009", as: "drawA" },
            { card: "BT1-010", as: "drawB" },
            { card: "BT1-011", as: "drawC" },
            ...Array.from({ length: 20 }, () => "BT1-012"),
          ],
        },
        1: { deck: Array.from({ length: 20 }, () => "BT1-012"), security: ["BT1-011", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const hostId = s.perm("host").permanentId;
    const eggId = s.perm("host").stack.find((card) => card.cardId === "P-188")!.instanceId;
    const tamer1Id = s.inst("tamer1").instanceId;
    const tamer2Id = s.inst("tamer2").instanceId;
    const tamer3Id = s.inst("tamer3").instanceId;
    const firstDrawId = s.state.players[0]!.deck[0]!.instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer1").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === tamer1Id) &&
        s.state.players[0]!.hand.some((card) => card.instanceId === firstDrawId),
    );
    expect(s.state.memory).toBe(7);
    expect(s.perm("host").permanentId).toBe(hostId);
    expect(s.perm("host").stack.some((card) => card.instanceId === eggId)).toBe(true);
    const secondDrawId = s.state.players[0]!.deck[0]!.instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: tamer2Id })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === tamer2Id),
    );
    expect(s.state.memory).toBe(4);
    await settle();
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === secondDrawId)).toBe(false);
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(secondDrawId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === secondDrawId)).toBe(true);
    const thirdDrawId = s.state.players[0]!.deck[0]!.instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: tamer3Id })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === tamer3Id) &&
        s.state.players[0]!.hand.some((card) => card.instanceId === thirdDrawId),
    );
    expect(s.state.memory).toBe(0);
    expect(s.perm("host").permanentId).toBe(hostId);
    expect(s.perm("host").stack.some((card) => card.instanceId === eggId)).toBe(true);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
