import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX12-071.js";
import "../index.js";

describe("EX12-071 Saneiketsu Invitation", () => {
  it("maps Use Req, the SW payment, Delay digivolution, and Security", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find((effect) => effect.trigger === "Static")?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      condition: { kind: "youHave", filter: { nameOrTrait: [{ tokens: ["SW"], match: "trait" }] } },
    });
    const main = compiled.effects.find((effect) => effect.trigger === "Main");
    expect(main?.actions).toMatchObject([
      {
        kind: "Draw",
        amount: 2,
        cost: {
          kind: "trash",
          target: { filter: { zone: "hand", nameOrTrait: [{ tokens: ["SW"], match: "trait" }] }, count: 1 },
        },
        abortOnDecline: true,
      },
      { kind: "PlaceInBattleAreaSelf" },
    ]);
    const delay = compiled.effects.find((effect) => effect.trigger === "AllTurns");
    expect(delay?.keywords).toEqual([{ keyword: "Delay", raw: "＜Delay＞" }]);
    expect(delay?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["SW"], match: "trait" }] },
      actions: [
        {
          kind: "Digivolve",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          into: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Saneiketsu"], match: "trait" }] },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
      ],
    });
    expect(delay?.actions[0]?.actions[0]).not.toHaveProperty("ignoreRequirements");
    expect(compiled.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "ActivateMain" }],
    });
  });

  it("trashes an SW card before drawing and placing itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-006", as: "sw" }],
          hand: [
            { card: "EX12-071", as: "option" },
            { card: "EX12-006", as: "payment" },
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
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-071"));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("payment").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-071")).toBe(true);
  });

  it("does not draw or place itself when the SW cost cannot be paid", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-006", as: "sw" }],
          hand: [{ card: "EX12-071", as: "option" }],
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
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "EX12-071"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-071")).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("consumes Delay to free-digivolve an SW host into Saneiketsu", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-015", as: "host" },
            { card: "EX12-006", as: "played" },
          ],
          hand: [
            { card: "EX12-071", as: "source" },
            { card: "EX12-006", as: "payment" },
            { card: "EX12-019", as: "target" },
          ],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-071"));
    const sourcePermanent = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.cardId === "EX12-071",
    )!;
    sourcePermanent.enterFieldTurnCount = s.state.turnCount - 1;

    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("played").permanentId,
    });
    await settle(() => s.perm("host").topCard?.cardId === "EX12-019");

    expect(s.perm("host").topCard?.cardId).toBe("EX12-019");
    expect(s.perm("host").stack.map((card) => card.cardId)).toContain("EX12-015");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("target").instanceId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX12-071")).toBe(true);
  });

  it("keeps printed evolution requirements when the host is not a legal level", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-006", as: "host" },
            { card: "EX12-022", as: "played" },
          ],
          hand: [
            { card: "EX12-071", as: "source" },
            { card: "EX12-006", as: "payment" },
            { card: "EX12-019", as: "target" },
          ],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-071"));
    const sourcePermanent = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.cardId === "EX12-071",
    )!;
    sourcePermanent.enterFieldTurnCount = s.state.turnCount - 1;

    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("played").permanentId,
    });
    await settle();

    expect(s.perm("host").topCard?.cardId).toBe("EX12-006");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("target").instanceId)).toBe(true);
  });

  it("activates Main from security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "EX12-071", as: "securityOption", faceUp: true }],
          hand: [{ card: "EX12-006", as: "payment" }],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("payment").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-071")).toBe(true);
  });
});
