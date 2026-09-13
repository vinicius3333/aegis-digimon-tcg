import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settleAcrossTimers } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT11-098.js";
import { compiled } from "./BT11-060.js";

describe("BT11-060 Monmon", () => {
  it("maps the catalog facts and opponent-only return protection to IR", () => {
    expect(getCardDefinition("BT11-060")).toMatchObject({
      cardId: "BT11-060",
      colors: ["Black"],
      level: 3,
      playCost: 3,
      dp: 2000,
      types: ["Beast"],
    });
    expect(compiled.effects).toMatchObject([
      {
        trigger: "AllTurns",
        actions: [{ kind: "Restrict", restriction: "beReturned", byOpponentEffectsOnly: true }],
      },
    ]);
  });

  it("prevents public opponent-effect returns while a neighboring Digimon returns", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-060", as: "monmon" },
            { card: "BT1-064", as: "neighbor" },
          ],
        },
        1: {
          battleArea: [{ card: "BT11-085", as: "seadramon", under: ["BT1-029"] }],
          hand: [
            { card: "BT11-098", as: "firstFox" },
            { card: "BT11-098", as: "secondFox" },
          ],
          deck: Array.from({ length: 5 }, () => "BT1-009"),
          security: Array.from({ length: 4 }, () => "BT1-009"),
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true, preferInstanceIds: preferred },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    const monmonId = s.perm("monmon").topCard.instanceId;
    const monmonPermanentId = s.perm("monmon").permanentId;
    const firstFoxId = s.inst("firstFox").instanceId;
    const secondFoxId = s.inst("secondFox").instanceId;
    const neighborId = s.perm("neighbor").topCard.instanceId;
    preferred.push(neighborId);
    expect(observe(s.engine).isRestricted(s.perm("monmon"), "beReturned")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("neighbor"), "beReturned")).toBe(false);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: firstFoxId })).toEqual({ ok: true });
    await settleAcrossTimers(
      () => s.state.players[0]!.deck.some((c) => c.instanceId === neighborId) && s.state.pendingDecision === undefined,
    );
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.players[0]!.deck.map((c) => c.instanceId)).toEqual([neighborId]);
    expect(s.state.memory).toBe(5);
    expect(s.perm("monmon").permanentId).toBe(monmonPermanentId);
    expect(s.perm("monmon").topCard.instanceId).toBe(monmonId);
    preferred.splice(0, preferred.length, monmonId);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("secondFox").instanceId })).toEqual({
      ok: true,
    });
    await settleAcrossTimers(
      () =>
        s.state.players[1]!.trash.some((c) => c.instanceId === secondFoxId) &&
        s.state.players[0]!.deck.some((c) => c.instanceId === neighborId) &&
        s.state.pendingDecision === undefined,
    );
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.deck.map((c) => c.instanceId)).toEqual([neighborId]);
    expect(s.perm("monmon").permanentId).toBe(monmonPermanentId);
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
    s.state.turnSeat = 0;
    // Unsourced return control: the restriction applies only to opponent effects.
    await advance(s.engine).verb.returnToHand([monmonId]);
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toEqual([monmonId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });
});
