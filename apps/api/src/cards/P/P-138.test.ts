import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { Phase } from "@aegis/shared";
import "./P-138.js";

describe("P-138 Veedramon", () => {
  it("reveals three cards, adds a Veedramon and blue Tamer, and bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-138", as: "source" }],
          deck: ["BT11-027", "BT1-086", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.cardId === "BT11-027") &&
        s.state.players[0]!.hand.some((card) => card.cardId === "BT1-086"),
    );

    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT11-027", "BT1-086"]),
    );
    assertNoLoudGap(s);
  });

  it("has the inherited once-per-turn memory gain when it becomes unsuspended", () => {
    expect(getCompiledCard("P-138")?.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "YourTurn",
          isInherited: true,
          frequency: "OncePerTurn",
          actions: [
            {
              kind: "SubTrigger",
              event: "whenUnsuspended",
              sourceFilter: { isSelfRef: true },
              actions: [{ kind: "GainMemory", amount: 1 }],
            },
          ],
        }),
      ]),
    );
  });

  it("gains one memory when an inherited host becomes unsuspended", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT11-027", as: "host", under: ["P-138"], suspended: true }] } });
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    await settle();
    expect(s.state.memory).toBe(1);
  });

  it("denies a second same-turn unsuspend trigger and resets on the next natural turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-029", as: "host", under: ["P-138"], suspended: true }],
        hand: ["BT1-009"],
        deck: ["BT1-009", "BT1-009", "BT1-009"],
      },
      1: { hand: ["BT1-009"], deck: ["BT1-009", "BT1-009", "BT1-009"] },
    });
    s.state.turnSeat = 0;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.phase).toBe(Phase.Main);
    const afterFirst = s.state.memory;
    expect(afterFirst).toBe(1);

    await advance(s.engine).verb.suspend([s.perm("host").permanentId]);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    await settle();
    expect(s.state.memory).toBe(afterFirst);
    await advance(s.engine).verb.suspend([s.perm("host").permanentId]);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    // The natural turn transition restores the 3-memory baseline, then the reset trigger gains 1.
    expect(s.state.memory).toBe(4);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
