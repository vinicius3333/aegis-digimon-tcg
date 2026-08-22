import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX12-070.js";
import "../index.js";

describe("EX12-070 Sanmyojin Arrival", () => {
  it("maps Use Req, the mandatory TB cost, full leave trigger, Delay activation, and Security", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find((effect) => effect.trigger === "Static")?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      condition: { kind: "youHave", filter: { nameOrTrait: [{ tokens: ["TB"], match: "trait" }] } },
    });
    const main = compiled.effects.find((effect) => effect.trigger === "Main" && effect.keywords === undefined);
    expect(main?.actions).toMatchObject([
      {
        kind: "Draw",
        amount: 2,
        cost: {
          kind: "trash",
          target: { filter: { zone: "hand", nameOrTrait: [{ tokens: ["TB"], match: "trait" }] }, count: 1 },
        },
        abortOnDecline: true,
      },
      { kind: "PlaceInBattleAreaSelf" },
    ]);
    const arm = compiled.effects.find((effect) => effect.trigger === "AllTurns");
    expect(arm?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenDigimonWouldLeave",
      sourceFilter: { kind: ["Digimon"], levelComparison: { op: "gte", value: 5 } },
      actions: [{ kind: "PlayWithoutCost", from: ["hand"], payCost: false }],
    });
    expect(arm?.keywords).toEqual([{ keyword: "Delay", raw: "＜Delay＞" }]);
    expect(compiled.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "ActivateMain" }],
    });
  });

  it("trashes a TB card before drawing and placing itself in the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-063", as: "tb" }],
          hand: [
            { card: "EX12-070", as: "option" },
            { card: "EX12-063", as: "payment" },
          ],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.engine.recomputeContinuousEffects();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-070"));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("payment").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-070")).toBe(true);
  });

  it("does not place itself or draw when the TB cost cannot be paid", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-063", as: "tb" }],
          hand: [{ card: "EX12-070", as: "option" }],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "EX12-070"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-070")).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("activates Main from security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "EX12-070", as: "securityOption", faceUp: true }],
          hand: [{ card: "EX12-063", as: "payment" }],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("payment").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-070")).toBe(true);
  });

  it("arms Delay when a level 5 TB Digimon would leave and consumes it to play Sanmyojin", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-063", as: "victim" }],
          hand: [
            { card: "EX12-070", as: "option" },
            { card: "EX12-063", as: "payment" },
            { card: "EX12-065", as: "sanmyojin" },
          ],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-070"));
    const optionPermanent = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.cardId === "EX12-070",
    )!;
    optionPermanent.enterFieldTurnCount = s.state.turnCount - 1;
    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-065"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-065")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX12-070")).toBe(true);
  });
});
