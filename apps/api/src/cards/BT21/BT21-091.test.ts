import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-091.js";
import "../index.js";

describe("BT21-091 Spirit Evolution!", () => {
  it("keeps the inherited-Tamer watcher separate from the Delay digivolution payload", () => {
    const allTurns = compiled.effects.filter((entry) => entry.trigger === "AllTurns");
    expect(allTurns).toHaveLength(2);
    expect(allTurns[0]?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { hasInheritedEffects: true, kind: ["Tamer"] },
    });
    expect(allTurns[1]?.keywords).toEqual([{ keyword: "Delay", raw: "＜Delay＞" }]);
    expect(allTurns[1]?.actions[0]).toMatchObject({
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
});
