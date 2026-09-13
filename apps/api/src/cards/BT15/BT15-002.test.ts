import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "../index.js";
import { compiled } from "./BT15-002.js";

describe("BT15-002", () => {
  it("registers the inherited once-per-turn On Add to Hand DP effect", () => {
    const effects = getEffectModule("BT15-002")?.effectsForTiming(EffectTiming.None, {} as never);
    expect(effects).toHaveLength(1);
    expect(effects?.[0]).toMatchObject({ isInherited: true, maxPerTurn: 1 });
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectAddsToHand",
          fireCondition: { kind: "triggerByYourDigimonEffect" },
          actions: [{ kind: "ModifyDP", amount: 1000, duration: "untilOpponentTurnEnd" }],
        },
      ],
    });
  });

  it("gives its host +1000 DP when an own Digimon effect draws during the owner's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-021", as: "watcher", under: ["BT15-002"] }],
          hand: [{ card: "BT15-026", as: "drawSource" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    const before = s.perm("watcher").baseDP;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("drawSource").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("watcher").currentDP === before + 1000);

    expect(s.perm("watcher").currentDP).toBe(before + 1000);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });

  it("removes the temporary DP increase at the end of the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-021", as: "watcher", under: ["BT15-002"] }],
          hand: [{ card: "BT15-026", as: "drawSource" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { deck: ["BT1-010"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const before = s.perm("watcher").baseDP;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("drawSource").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("watcher").currentDP === before + 1000);

    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);

    expect(s.perm("watcher").currentDP).toBe(before);
  });

  it("does not gain DP when an own Digimon effect draws during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT15-021", as: "watcher", under: ["BT15-002"] },
          { card: "BT13-061", as: "drawSource", under: ["BT15-005"], suspended: true },
        ],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
    });
    s.state.turnSeat = 1;
    const before = s.perm("watcher").baseDP;

    await advance(s.engine).verb.unsuspend([s.perm("drawSource").permanentId]);
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.perm("watcher").currentDP).toBe(before);
  });

  it("does not gain DP when an Option effect draws during the owner's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-027", as: "watcher", under: ["BT15-002"] }],
        hand: [{ card: "BT1-097", as: "option" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
    });
    s.state.memory = 10;
    const before = s.perm("watcher").baseDP;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.perm("watcher").currentDP).toBe(before);
  });

  it("applies the boost once in a turn and allows it again after the next turn starts", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-021", as: "watcher", under: ["BT15-002"] }],
          hand: [
            { card: "BT15-019", as: "firstDraw" },
            { card: "BT15-019", as: "secondDraw" },
            { card: "BT15-019", as: "nextTurnDraw" },
          ],
          deck: [
            { card: "BT1-009", as: "firstCard" },
            { card: "BT1-010", as: "secondCard" },
            { card: "BT1-009", as: "nextTurnCard" },
            { card: "BT1-010", as: "turnDraw" },
            { card: "BT1-009", as: "extraDraw1" },
            { card: "BT1-010", as: "extraDraw2" },
          ],
        },
        1: { deck: ["BT1-009"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    const before = s.perm("watcher").baseDP;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstDraw").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("watcher").currentDP === before + 1000);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondDraw").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.perm("watcher").currentDP).toBe(before + 1000);

    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 10;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.perm("watcher").currentDP === before);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("nextTurnDraw").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("watcher").currentDP === before + 1000);
    expect(s.perm("watcher").currentDP).toBe(before + 1000);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
  });
});
