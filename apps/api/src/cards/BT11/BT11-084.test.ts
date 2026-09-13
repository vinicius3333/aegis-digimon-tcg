import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT11-016.js";
import "./BT11-086.js";
import { compiled } from "./BT11-084.js";

describe("BT11-084 BlueMeramon", () => {
  it("maps catalog facts and every printed effect to IR", () => {
    expect(getCardDefinition("BT11-084")).toMatchObject({
      cardId: "BT11-084",
      colors: ["Purple"],
      level: 5,
      playCost: 8,
      dp: 6000,
      types: ["Flame"],
    });
    expect(compiled.effects).toMatchObject([
      { trigger: "Static", keywords: [{ keyword: "Retaliation" }] },
      { trigger: "WhenDigivolving", actions: [{ kind: "Draw", amount: 2 }, { kind: "Trash" }] },
      { trigger: "AllTurns", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SubTrigger" }] },
    ]);
  });

  it("draws 2 then trashes 2 when digivolving and has Retaliation", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-079", as: "base" }],
          hand: [{ card: "BT11-084", as: "blue-meramon" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("blue-meramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 2);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Retaliation")).toBe(true);
  });

  it("inherits memory gain only for an effect-played Digimon and only once per turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST6-13", as: "host", under: ["BT11-084"] },
            { card: "BT11-016", as: "phoenix" },
          ],
          hand: [
            { card: "BT11-086", as: "firstMerva" },
            { card: "BT11-086", as: "nextMerva" },
            { card: "BT1-012", as: "biyomon" },
          ],
          trash: [
            { card: "BT11-079", as: "firstPlayed" },
            { card: "BT11-079", as: "nextPlayed" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "spare" },
            { card: "BT1-080", as: "victim", suspended: true, dp: 13000 },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("firstPlayed").instanceId, s.inst("nextPlayed").instanceId);
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstMerva").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("firstPlayed").instanceId) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.memory).toBe(0);

    const phoenixId = s.inst("phoenix").instanceId;
    const phoenixPermanentId = s.perm("phoenix").permanentId;
    const victimId = s.perm("victim").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: phoenixPermanentId,
        target: { kind: "permanent", permanentId: victimId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === phoenixId) &&
        s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("biyomon").instanceId) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.memory).toBe(0);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("nextMerva").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("nextPlayed").instanceId) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.memory).toBe(-7);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });
});
