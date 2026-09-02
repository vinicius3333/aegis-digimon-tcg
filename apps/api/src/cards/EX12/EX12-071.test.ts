import { compiledEffects, EffectTiming, getCardDefinition } from "@aegis/shared";
import { irNode } from "../../engine/testkit/irNode.js";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { compiled } from "./EX12-071.js";
import "../index.js";

describe("EX12-071 Saneiketsu Invitation", () => {
  it("maps Use Req, the SW payment, Delay digivolution, and Security", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find((effect) => effect.trigger === "Static")?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      // CR 16-42-3 scopes ＜Use Req.＞ to Digimon and Tamers on the field. Drop the kind gate and
      // a resident [SW] OPTION permanent (this very card, once placed) satisfies its own Use Req.
      condition: {
        kind: "youHave",
        filter: { kind: ["Digimon", "Tamer"], nameOrTrait: [{ tokens: ["SW"], match: "trait" }] },
      },
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
    expect(irNode(delay?.actions[0])?.actions[0]).not.toHaveProperty("ignoreRequirements");
    expect(compiled.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "ActivateMain" }],
    });
    expect(registeredCompiledCards.get("EX12-071")).toEqual(compiled);
    expect(compiledEffects["EX12-071"]).toBeDefined();
    expect(compiledEffects["EX12-071"]).toEqual(compiled);
  });

  it("trashes an SW card before drawing and placing itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-104", as: "sw" }],
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

  it("does not draw or place itself when the controller declines the SW cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-104", as: "sw" }],
          hand: [
            { card: "EX12-071", as: "option" },
            { card: "EX12-006", as: "payment" },
          ],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional"));
    const decision = s.decisions.find(({ req }) => req.kind === "optional")!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.req.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "EX12-071"));

    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("payment").instanceId);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX12-071")).toBe(false);
  });

  it("consumes Delay to free-digivolve an SW host into Saneiketsu", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-015", as: "host" }],
          hand: [
            { card: "EX12-071", as: "source" },
            { card: "EX12-006", as: "payment" },
            { card: "EX12-006", as: "played" },
            { card: "EX12-019", as: "target" },
          ],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-071"));
    const sourcePermanent = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.cardId === "EX12-071",
    )!;
    sourcePermanent.enterFieldTurnCount = s.state.turnCount - 1;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
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

  // Mutation guard for the CR 16-42-3 kind gate on the ＜Use Req.＞ condition: EX12-074 is an
  // OPTION whose colors never satisfy this card's colour requirement, yet it carries the [SW]
  // trait and EX12 Options sit in the battle area. Remove `kind: ["Digimon", "Tamer"]` from the
  // youHave filter and this play is wrongly allowed.
  it("is not enabled by a resident Option carrying the Use Req. trait", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX12-074", as: "residentOption" }],
        hand: [{ card: "EX12-071", as: "useReqOption" }],
      },
    });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("useReqOption").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
  });

  it("matches the complete catalog identity", () => {
    expect(getCardDefinition("EX12-071")).toMatchObject({
      nameEn: "Saneiketsu Invitation",
      colors: ["Black", "Blue", "Red"],
      kinds: ["Option"],
      playCost: 3,
      dp: 0,
      evoCosts: [],
      types: ["Shambala", "SW"],
    });
  });
});
