import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-243.js";

const DECK = Array(20).fill("BT1-009");
const SECURITY = Array(20).fill("BT1-009");

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
            cost: expect.objectContaining({
              kind: "trash",
              target: { filter: { controller: "mine", zone: ["hand"] }, count: 1 },
            }),
            optional: true,
            abortOnDecline: true,
          }),
          { kind: "PlaceInBattleAreaSelf" },
        ],
      }),
    );
  });

  it("arms Delay only when the opponent has a Digimon and exposes the printed return-and-play cost", () => {
    const effects = runtimeCompiledCard("P-243")!.effects;
    expect(effects).toContainEqual(
      expect.objectContaining({
        trigger: "StartOfYourTurn",
        condition: expect.objectContaining({ kind: "opponentHas" }),
        keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
        actions: [
          expect.objectContaining({
            kind: "PlayWithoutCost",
            from: ["trash"],
            optional: true,
          }),
        ],
      }),
    );
    const delayed = effects.find((effect) => effect.trigger === "StartOfYourTurn")!;
    expect(delayed.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      target: expect.objectContaining({
        filter: { controller: "mine", nameOrTrait: [{ tokens: ["DM"], match: "trait" }], playCostLte: 3 },
      }),
      cost: expect.objectContaining({
        kind: "return",
        to: "deckTop",
        target: {
          filter: {
            controller: "mine",
            zone: ["trash"],
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["DM"], match: "trait" }],
          },
          count: 1,
        },
        raw: expect.stringContaining("top of your deck"),
      }),
    });
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
            { card: "ST1-16", as: "cost" },
          ],
          deck: [
            { card: "BT1-009", as: "drawOne" },
            { card: "BT1-009", as: "drawTwo" },
          ],
          battleArea: [{ card: "BT22-049", as: "dmField" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("digiseabass").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("drawOne").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("drawTwo").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((c) => c.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "P-243")).toBe(true);
  });

  it("uses Delay at the next natural own turn to return and play an exact low-cost DM Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "P-243", as: "digiseabass" },
            { card: "ST1-16", as: "cost" },
          ],
          trash: [
            { card: "BT22-049", as: "dmPlay" },
            { card: "BT22-049", as: "dmReturn" },
          ],
          battleArea: [{ card: "BT22-049", as: "dmField" }],
          deck: DECK,
          security: SECURITY,
        },
        1: { battleArea: ["BT1-009"], deck: DECK, security: SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const pawnId = s.inst("digiseabass").instanceId;
    const returnId = s.inst("dmReturn").instanceId;
    const playId = s.inst("dmPlay").instanceId;
    preferred.push(returnId);
    s.state.memory = 10;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("digiseabass").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === pawnId) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.memory).toBe(7);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === playId) &&
        s.state.players[0]!.hand.some((card) => card.instanceId === returnId) &&
        s.state.players[0]!.trash.some((card) => card.instanceId === pawnId) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === playId)).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(returnId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).not.toContain(returnId);
    expect(s.state.players[0]!.trash.some((c) => c.instanceId === returnId)).toBe(false);
    expect(s.state.players[0]!.trash.some((c) => c.instanceId === pawnId)).toBe(true);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("keeps the Option and trash unchanged when the opponent has no Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-243", as: "digiseabass" }],
          hand: ["BT1-009"],
          trash: [{ card: "BT22-049", as: "dm" }],
          deck: DECK,
          security: SECURITY,
        },
        1: { hand: ["BT1-009"], deck: DECK, security: SECURITY },
      },
      { autoSelectCards: true },
    );
    const pawnId = s.inst("digiseabass").instanceId;
    const dmId = s.inst("dm").instanceId;
    s.state.memory = 10;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await settle();
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === pawnId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === dmId)).toBe(true);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("retains the Option and eligible DM card when the optional Delay play is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-243", as: "digiseabass" }],
          hand: ["BT1-009"],
          trash: [{ card: "BT22-049", as: "dm" }],
          deck: DECK,
          security: SECURITY,
        },
        1: { battleArea: ["BT1-009"], hand: ["BT1-009"], deck: DECK, security: SECURITY },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const pawnId = s.inst("digiseabass").instanceId;
    const dmId = s.inst("dm").instanceId;
    s.state.memory = 10;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await settle();
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === pawnId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === dmId)).toBe(true);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
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
