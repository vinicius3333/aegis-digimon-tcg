import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-243.js";

describe("P-243 Digiseabass", () => {
  it("requires DM and trashes a hand card to draw two and place itself", () => {
    const effects = runtimeCompiledCard("P-243")!.effects;
    expect(effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        actions: [
          expect.objectContaining({
            kind: "WaiveColorRequirement",
            condition: expect.objectContaining({ kind: "youHave" }),
          }),
        ],
      }),
    );
    expect(effects).toContainEqual(
      expect.objectContaining({
        trigger: "Main",
        actions: [
          expect.objectContaining({
            kind: "Draw",
            amount: 2,
            cost: expect.objectContaining({ kind: "trash", target: { filter: { controller: "mine" }, count: 1 } }),
          }),
          { kind: "PlaceInBattleAreaSelf" },
        ],
      }),
    );
  });

  it("arms Delay only when the opponent has a Digimon and returns a DM Digimon before playing", () => {
    const effects = runtimeCompiledCard("P-243")!.effects;
    expect(effects).toContainEqual(
      expect.objectContaining({
        trigger: "StartOfYourTurn",
        actions: [
          expect.objectContaining({
            kind: "GainKeyword",
            duration: "permanent",
            condition: expect.objectContaining({ kind: "opponentHas" }),
          }),
          expect.objectContaining({
            kind: "PlayWithoutCost",
            requiresDelayArmed: true,
            from: ["trash"],
            optional: true,
            target: expect.objectContaining({
              filter: { controller: "mine", nameOrTrait: [{ tokens: ["DM"], match: "trait" }], playCostLte: 3 },
            }),
            cost: expect.objectContaining({
              kind: "return",
              target: {
                filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["DM"], match: "trait" }] },
                count: 1,
              },
              raw: expect.stringContaining("top of your deck"),
            }),
          }),
        ],
      }),
    );
  });

  it("plays a qualifying DM card from hand or trash through Security", () => {
    expect(runtimeCompiledCard("P-243")!.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Security",
        isSecurity: true,
        actions: [
          expect.objectContaining({
            kind: "PlayWithoutCost",
            from: ["hand", "trash"],
            optional: true,
            target: {
              filter: { controller: "mine", nameOrTrait: [{ tokens: ["DM"], match: "trait" }], playCostLte: 3 },
              count: 1,
            },
            payCost: false,
          }),
        ],
      }),
    );
  });
});
describe("P-243 engine behavior", () => {
  it("trashes a hand card, draws two, and places itself", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "P-243", as: "digiseabass" },
            { card: "BT1-001", as: "cost" },
          ],
          deck: [
            { card: "BT1-002", as: "drawOne" },
            { card: "BT1-003", as: "drawTwo" },
          ],
          battleArea: [{ card: "P-016", as: "black" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("digiseabass").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("drawOne").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("drawTwo").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((c) => c.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "P-243")).toBe(true);
  });

  it("uses its Delay at the start of turn to return and play a low-cost DM Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "P-243", as: "digiseabass" },
            { card: "BT1-001", as: "cost" },
          ],
          trash: [
            { card: "BT22-049", as: "dmReturn" },
            { card: "BT22-049", as: "dmPlay" },
          ],
          battleArea: ["P-016"],
        },
        1: { battleArea: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("digiseabass").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    await advance(s.engine).fireGlobal(EffectTiming.OnStartTurn);
    await settle();
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("dmPlay").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck[0]?.instanceId).toBe(s.inst("dmReturn").instanceId);
    expect(s.state.players[0]!.trash.some((c) => c.instanceId === s.inst("dmReturn").instanceId)).toBe(false);
  });

  it("plays a qualifying low-cost DM card from trash through its real Security effect", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "P-243", as: "digiseabass" }], trash: [{ card: "BT22-049", as: "dmPlay" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("digiseabass"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("dmPlay").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("dmPlay").instanceId)).toBe(true);
  });
});
