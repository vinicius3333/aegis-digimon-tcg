import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-091.js";
import "../index.js";

describe("BT21-091 Spirit Evolution!", () => {
  it("keeps the inherited-Tamer watcher separate from the Delay digivolution payload", () => {
    const allTurns = compiled.effects.filter((entry) => entry.trigger === "AllTurns");
    expect(allTurns).toHaveLength(1);
    expect(allTurns[0]?.keywords).toEqual([{ keyword: "Delay", raw: "＜Delay＞" }]);
    expect(allTurns[0]?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { hasInheritedEffects: true, kind: ["Tamer"] },
    });
    const watcher = allTurns[0]?.actions[0];
    if (watcher?.kind !== "SubTrigger") throw new Error("expected reactive Delay watcher");
    expect(watcher.actions[0]).toMatchObject({
      kind: "Digivolve",
      payCost: false,
      from: ["hand"],
      optional: true,
      target: { filter: { kind: ["Tamer"] } },
      into: { nameOrTrait: [{ tokens: ["Hybrid"], match: "trait" }] },
    });
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Main",
        actions: [expect.objectContaining({ kind: "Draw", abortOnDecline: true }), { kind: "PlaceInBattleAreaSelf" }],
      }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Security",
        isSecurity: true,
        actions: expect.arrayContaining([
          expect.objectContaining({ kind: "PlayWithoutCost", from: ["hand", "trash"], optional: true }),
          expect.objectContaining({ kind: "AddToHandSelf" }),
        ]),
      }),
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("pays a Hybrid from hand, draws 2, and places itself in the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-082", as: "color" }],
          hand: [
            { card: "BT21-091", as: "option" },
            { card: "BT21-013", as: "hybridCost" },
          ],
          deck: [
            { card: "BT1-009", as: "drawA" },
            { card: "BT1-010", as: "drawB" },
          ],
        },
        1: { deck: ["BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-091"));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("hybridCost").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("drawA").instanceId, s.inst("drawB").instanceId]),
    );
    expect(s.state.memory).toBe(0);
  });

  it("declining the Hybrid cost neither draws nor places the option", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-082", as: "color" }],
          hand: [
            { card: "BT21-091", as: "option" },
            { card: "BT21-013", as: "hybridCost" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("hybridCost").instanceId)).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-091")).toBe(false);
  });

  it("waives color while a Tamer with an inherited-effect source is on the field", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-083", as: "tamer", under: ["BT21-082"] }],
          hand: [{ card: "BT21-091", as: "option" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
  });

  it("Security may play an inherited-effect Tamer from trash, then adds itself to hand", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT21-091", as: "option" }],
          trash: [{ card: "BT21-082", as: "takuya" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-082")).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("triggers Delay from a public inherited-effect Tamer play and evolves it into a Hybrid", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-082", as: "color" }],
          hand: [
            { card: "BT21-091", as: "option" },
            { card: "BT21-013", as: "hybridCost" },
            { card: "BT21-082", as: "takuya" },
            { card: "BT17-011", as: "hybrid" },
            { card: "BT1-009", as: "drawA" },
          ],
          deck: [{ card: "BT1-010", as: "drawB" }, "BT1-009", "BT1-009", "BT1-009"],
        },
        1: { deck: ["BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT21-091"));
    // CR 16-17-3: Delay gained this turn cannot be activated until a later turn.
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 10;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("takuya").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("hybrid").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT17-011")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
  });
});
