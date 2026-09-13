import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-050.js";

describe("BT11-050 Ninjamon", () => {
  it("maps its green champion catalog facts and once-per-turn inherited trigger", () => {
    expect(getCardDefinition("BT11-050")).toMatchObject({
      cardId: "BT11-050",
      colors: ["Green"],
      level: 4,
      playCost: 5,
      dp: 5000,
      types: ["Mutant"],
    });
    expect(compiled.effects).toMatchObject([
      {
        trigger: "YourTurn",
        frequency: "OncePerTurn",
        isInherited: true,
        actions: [{ kind: "SubTrigger", event: "whenPlayed" }],
      },
    ]);
  });

  it("inherited effect suspends an opponent's Digimon when its controller plays a Tamer", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-071", as: "host", under: ["BT11-050"] }, "BT1-071"],
          hand: [
            { card: "BT1-088", as: "firstTamer" },
            { card: "BT1-088", as: "secondTamer" },
            { card: "BT1-088", as: "thirdTamer" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          security: ["BT1-014", "BT1-015"],
        },
        1: {
          battleArea: [
            { card: "BT1-028", as: "firstTarget", suspended: true },
            { card: "BT1-028", as: "secondTarget" },
          ],
          deck: ["BT1-016", "BT1-017", "BT1-018", "BT1-019", "BT1-020"],
          security: ["BT1-021", "BT1-022"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds: preferred },
    );
    const firstTargetId = s.perm("firstTarget").topCard!.instanceId;
    const secondTargetId = s.perm("secondTarget").topCard!.instanceId;
    preferred.push(firstTargetId);
    s.state.isFirstPlayersFirstTurn = false;
    s.state.memory = 10;
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("firstTarget").isSuspended);
    expect(s.perm("firstTarget").topCard?.instanceId).toBe(firstTargetId);
    expect(s.perm("secondTarget").isSuspended).toBe(false);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        !s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("secondTamer").instanceId),
    );
    expect(s.perm("secondTarget").isSuspended).toBe(false);

    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    expect(s.perm("firstTarget").isSuspended).toBe(false);
    expect(s.perm("secondTarget").isSuspended).toBe(false);

    preferred.splice(0, preferred.length, secondTargetId);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("thirdTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && s.perm("secondTarget").isSuspended);
    expect(s.perm("secondTarget").topCard?.instanceId).toBe(secondTargetId);
    expect(s.perm("secondTarget").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });

  it("does not react to the opponent playing a Tamer", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-018", under: ["BT11-050"] }] },
        1: {
          battleArea: [{ card: "BT1-028", as: "target" }],
          hand: [{ card: "BT1-085", as: "opponentTamer" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => !s.state.players[1]!.hand.some(({ instanceId }) => instanceId === s.inst("opponentTamer").instanceId),
    );

    expect(s.perm("target").isSuspended).toBe(false);
  });

  it("activates only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-018", under: ["BT11-050"] }],
          hand: [
            { card: "BT1-085", as: "firstTamer" },
            { card: "BT1-086", as: "secondTamer" },
          ],
        },
        1: { battleArea: [{ card: "BT1-028", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").isSuspended);
    await advance(s.engine).verb.unsuspend([s.perm("target").permanentId]);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => !s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("secondTamer").instanceId),
    );

    expect(s.perm("target").isSuspended).toBe(false);
  });
});
