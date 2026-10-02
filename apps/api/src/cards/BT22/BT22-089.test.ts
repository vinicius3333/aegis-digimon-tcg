import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT22-089.js";
import "../index.js";
import { battleAreaCardIds, runTurnThroughMainStart } from "./returningTamer.testSupport.js";

describe("BT22-089 Mirei Mikagura", () => {
  it("returns itself to the deck bottom before playing a qualifying card", () => {
    const start = compiled.effects.find((effect) => effect.trigger === "StartOfYourMainPhase");
    expect(start?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      abortOnDecline: true,
      cost: {
        kind: "return",
        to: "deckBottom",
        target: { filter: { isSelfRef: true }, isSelf: true },
      },
      target: {
        filter: {
          controller: "mine",
          kind: ["Tamer"],
          playCostGte: 4,
          nameOrTrait: expect.arrayContaining([
            { tokens: ["Mirei Mikagura"], match: "nameExact" },
            { tokens: ["CS"], match: "trait" },
          ]),
        },
      },
    });
  });

  it("trashes a qualifying hand card to draw two on play", () => {
    const onPlay = compiled.effects.find((effect) => effect.trigger === "OnPlay");
    expect(onPlay?.actions[0]).toMatchObject({
      kind: "Draw",
      controller: "mine",
      amount: 2,
      optional: true,
      abortOnDecline: true,
      cost: {
        kind: "trash",
        target: {
          filter: {
            controller: "mine",
            zone: "hand",
            nameOrTrait: expect.arrayContaining([
              { tokens: ["Holy Beast"], match: "trait" },
              { tokens: ["Angel"], match: "trait" },
              { tokens: ["Archangel"], match: "trait" },
              { tokens: ["Fallen Angel"], match: "trait" },
              { tokens: ["CS"], match: "trait" },
            ]),
          },
          count: 1,
        },
      },
    });
  });

  it("plays itself from security without paying its cost", () => {
    const security = compiled.effects.find((effect) => effect.trigger === "Security");
    expect(security).toMatchObject({ isSecurity: true });
    expect(security?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      payCost: false,
      target: { filter: { isSelfRef: true }, isSelf: true, count: 1 },
    });
  });

  it("pays the On Play hand-trash cost and draws two through a public play intent", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT22-089", as: "mirei" },
            { card: "BT22-054", as: "cost" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const mireiId = s.inst("mirei").instanceId;
    const costId = s.inst("cost").instanceId;
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: mireiId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === costId)).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT1-009", "BT1-010"]));
  });

  it("declines the optional 'by' cost by selecting no hand card and draws nothing", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT22-089", as: "mirei" },
          { card: "BT22-054", as: "cost" },
        ],
        deck: ["BT1-009", "BT1-010"],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mirei").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const decision = s.state.pendingDecision!;
    expect(s.decisions.at(-1)!.req.options?.min).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("cost").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("returns itself and plays a qualifying Tamer through the production main-phase window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-089", as: "mirei" }],
          hand: [{ card: "BT22-091", as: "arata" }],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireGlobal(EffectTiming.OnStartMainPhase);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT22-091"));

    expect(s.state.players[0]!.deck.some((card) => card.cardId === "BT22-089")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT22-091")).toBe(true);
  });
});

describe("BT22-089 Mirei Mikagura — play cost floor", () => {
  it("does not offer a play cost 3 [Mirei Mikagura] from hand (Discord 1555135721101197382)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-089", as: "mirei" }],
          hand: [{ card: "BT22-089", as: "cheapMirei" }],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireGlobal(EffectTiming.OnStartMainPhase);
    await settle(() => s.state.pendingDecision === undefined);

    const offered = s.decisions.flatMap(({ req }) =>
      req.kind === "selectCards" ? (req.options?.candidateInstanceIds ?? []) : [],
    );
    expect(offered).not.toContain(s.inst("cheapMirei").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("cheapMirei").instanceId);
  });
});

describe("BT22-089 Mirei Mikagura — KB Q&A rulings", () => {
  it("does not activate the [Start of Your Main Phase] effect of the Tamer it played (Q5560)", async () => {
    const opponent = { battleArea: ["BT1-009"] };
    await runTurnThroughMainStart(
      { 0: { battleArea: [{ card: "BT22-089", as: "mirei" }], hand: ["BT22-102"], deck: ["BT1-010"] }, 1: opponent },
      true,
      (played) => {
        expect(battleAreaCardIds(played)).toEqual(["BT22-102"]);
        expect(played.state.memory).toBe(3);
      },
    );

    await runTurnThroughMainStart({ 0: { battleArea: ["BT22-102"], deck: ["BT1-010"] }, 1: opponent }, true, (s) => {
      expect(s.state.memory).toBe(4);
    });
  });
});
