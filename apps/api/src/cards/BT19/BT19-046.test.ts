import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT19-046 Chamblemon", () => {
  it("public play pays 4, suspends an unsuspended opponent, and selects one of multiple Data targets", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine({
      0: { hand: [{ card: "BT19-046", as: "chamble" }], deck: ["BT19-030"] },
      1: { deck: ["BT19-030", "BT19-031"], battleArea: [
        { card: "BT19-044", as: "nonData" },
        { card: "BT19-037", as: "chosenData" },
        { card: "BT1-068", as: "otherData" },
        { card: "BT14-062", as: "nearMatch" },
      ] },
    }, { autoSelectCards: true, preferInstanceIds });
    preferInstanceIds.push(s.perm("chosenData").permanentId, s.perm("chosenData").topCard!.instanceId);
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, {
      type: "playCard", instanceId: s.inst("chamble").instanceId,
    })).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("chosenData"), "unsuspend"));
    const played = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT19-046");
    expect(played?.stack.map((card) => card.cardId)).toEqual([]);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT19-046")).toBe(false);
    expect(s.state.memory).toBe(0);
    expect(s.perm("nonData").isSuspended).toBe(false);
    expect(s.perm("chosenData").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("chosenData"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("otherData"), "unsuspend")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("nearMatch"), "unsuspend")).toBe(false);
    await advance(s.engine).runTurn(0);
    expect(s.perm("chosenData").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("chosenData"), "unsuspend")).toBe(true);
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("chosenData").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("chosenData"), "unsuspend")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    expect(observe(s.engine).isRestricted(s.perm("chosenData"), "unsuspend")).toBe(false);
  });

  it("public green level-3 evolution pays 2, retains its source, and resolves When Digivolving", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-067", as: "base" }],
        hand: [{ card: "BT19-046", as: "chamble" }], deck: ["BT19-030"],
      },
      1: { battleArea: [{ card: "BT19-044", as: "nonData" }, { card: "BT19-037", as: "data" }] },
    }, { autoSelectCards: true });
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, {
      type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("chamble").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-046");
    await settle(() => observe(s.engine).isRestricted(s.perm("data"), "unsuspend"));
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-067"]);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT19-046")).toBe(false);
    expect(s.state.memory).toBe(3);
    expect(s.perm("nonData").isSuspended).toBe(true);
    expect(s.perm("data").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("data"), "unsuspend")).toBe(true);
  });

  it("still restricts Data when the preceding Suspend action has zero legal targets", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT19-046", as: "chamble" }], deck: ["BT19-030"] },
      1: { battleArea: [
        { card: "BT19-044", as: "already", suspended: true },
        { card: "BT19-037", as: "data", suspended: true },
      ] },
    }, { autoSelectCards: true });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, {
      type: "playCard", instanceId: s.inst("chamble").instanceId,
    })).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("data"), "unsuspend"));
    expect(s.perm("already").isSuspended).toBe(true);
    expect(s.perm("data").isSuspended).toBe(true);
  });

  it("still suspends an eligible Digimon when the following Data restriction has zero targets", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT19-046", as: "chamble" }], deck: ["BT19-030"] },
      1: { battleArea: [{ card: "BT19-044", as: "nonData" }] },
    }, { autoSelectCards: true });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, {
      type: "playCard", instanceId: s.inst("chamble").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("nonData").isSuspended);
    expect(observe(s.engine).isRestricted(s.perm("nonData"), "unsuspend")).toBe(false);
  });

  it("does not offer an already-suspended Digimon for the first Suspend target", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine({
      0: { hand: [{ card: "BT19-046", as: "chamble" }], deck: ["BT19-030"] },
      1: { battleArea: [
        { card: "BT19-044", as: "already", suspended: true },
        { card: "BT1-010", as: "fresh" },
      ] },
    }, { autoSelectCards: true, preferInstanceIds });
    preferInstanceIds.push(s.perm("already").topCard!.instanceId);
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, {
      type: "playCard", instanceId: s.inst("chamble").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("fresh").isSuspended);
    expect(s.perm("already").isSuspended).toBe(true);
    expect(s.perm("fresh").isSuspended).toBe(true);
  });

});
