import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-046.js";

describe("BT11-046 Agumon", () => {
  it("maps its green rookie catalog facts and reveal/aura clauses", () => {
    expect(getCardDefinition("BT11-046")).toMatchObject({
      cardId: "BT11-046",
      colors: ["Green"],
      level: 3,
      playCost: 3,
      dp: 1000,
      types: ["Reptile"],
    });
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "RevealAdd", revealCount: 4, rest: "deckBottom" }],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [{ kind: "Aura", effect: { kind: "modifyDP", amount: 2000 } }],
    });
  });

  it("reveals 4, adds a Tamer to hand and bottom-decks the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT11-046", as: "agumon" }],
          deck: [
            { card: "BT11-091", as: "tamer" },
            { card: "BT1-064", as: "rest1" },
            { card: "BT1-065", as: "rest2" },
            { card: "BT1-066", as: "rest3" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("agumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("tamer").instanceId));

    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("rest1").instanceId, s.inst("rest2").instanceId, s.inst("rest3").instanceId]),
    );
  });

  it("gives its legal green level-4 host +2000 after a public Tamer play, then restores it each own turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-071", as: "host", under: ["BT11-046"] },
          { card: "BT1-013", as: "spare" },
        ],
        hand: [{ card: "BT1-086", as: "tamer" }],
        deck: ["BT1-013", "BT1-013", "BT1-013", "BT1-013", "BT1-013"],
        security: ["BT1-013", "BT1-013"],
      },
      1: { deck: ["BT1-013", "BT1-013", "BT1-013", "BT1-013", "BT1-013"], security: ["BT1-013", "BT1-013"] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(6000);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("tamer").instanceId),
    );
    expect(s.perm("host").currentDP).toBe(8000);

    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("host").currentDP).toBe(8000);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("host").currentDP).toBe(6000);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("host").currentDP).toBe(8000);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });
});
import { getCardDefinition } from "@aegis/shared";
