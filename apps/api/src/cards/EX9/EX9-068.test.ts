import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { EffectTiming } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import compiled from "./EX9-068.js";
import "../index.js";

describe("EX9-068", () => {
  it("may decline placement after paying suspend while retaining the mandatory draw and memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX9-068", as: "tamer" }],
        hand: [{ card: "BT1-024", as: "played" }, "BT1-009"],
        deck: ["BT1-010"],
      },
    });
    s.state.memory = 10;
    const playedId = s.inst("played").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: playedId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision !== undefined);
    const cost = s.state.pendingDecision;
    expect(cost?.kind).toBe("optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: cost!.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.pendingDecision !== undefined && s.state.pendingDecision.decisionId !== cost!.decisionId,
    );
    const placement = s.state.pendingDecision;
    expect(placement?.kind).toBe("optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: placement!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(
      s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.instanceId === playedId)?.stack,
    ).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.memory).toBe(4);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it("does not respond to an opponent's qualifying play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-068", as: "tamer" }], deck: ["BT1-010"] },
        1: { hand: [{ card: "BT1-024", as: "played" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it.each([
    { card: "BT1-024", cost: 7 },
    { card: "BT1-042", cost: 7 },
    { card: "EX9-063", cost: 8 },
  ])("responds to a real independent Cyborg/Machine/DM play of $card", async ({ card, cost }) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-068", as: "tamer" }],
          hand: [{ card, as: "played" }, "BT1-009"],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    const playedId = s.inst("played").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: playedId })).toEqual({ ok: true });
    await settle();
    const played = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.instanceId === playedId);
    expect(played?.stack).toHaveLength(1);
    expect(played?.stack[0]).toMatchObject({ cardId: "BT1-009", faceUp: false });
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.map((instance) => instance.cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[0]!.deck.map((instance) => instance.cardId)).toEqual(["BT1-011"]);
    expect(s.state.memory).toBe(10 - cost + 1);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it.each([false, true])(
    "Q4828 cannot draw, gain memory or place a source without paying suspend (already suspended: %s)",
    async (suspended) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "EX9-068", as: "tamer", suspended }],
            hand: [{ card: "BT1-024", as: "played" }, "BT1-009"],
            deck: ["BT1-010"],
          },
        },
        { autoDeclineOptional: true, autoSelectCards: true },
      );
      s.state.memory = 10;
      const playedId = s.inst("played").instanceId;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: playedId })).toEqual({ ok: true });
      await settle();
      expect(
        s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.instanceId === playedId)?.stack,
      ).toHaveLength(0);
      expect(s.perm("tamer").isSuspended).toBe(suspended);
      expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);
      expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010"]);
      expect(s.state.memory).toBe(3);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );
  it.each([
    { card: "BT1-021", cost: 6 },
    { card: "BT1-076", cost: 7 },
  ])("rejects the cost or trait near-match $card on real play", async ({ card, cost }) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-068", as: "tamer" }], hand: [{ card, as: "played" }], deck: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((instance) => instance.cardId)).toEqual(["BT1-010"]);
    expect(s.state.memory).toBe(10 - cost);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  const source = {
    instanceId: "source",
    cardId: "EX9-068",
    ownerSeat: 0,
    definition: {},
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => true,
  } as never;
  it("registers start-of-turn memory setting and security play", () => {
    expect(getEffectModule("EX9-068")!.effectsForTiming(EffectTiming.OnStartTurn, source)).toHaveLength(1);
    expect(getEffectModule("EX9-068")!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
  });
  it("registers the cost-seven-or-more Cyborg/Machine/DM play response", () =>
    expect(getEffectModule("EX9-068")!.effectsForTiming(EffectTiming.None, source)).toHaveLength(1));
  it("encodes the qualifying play response and its suspend cost as compiled IR", () => {
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[1]).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "mine", kind: ["Digimon"], playCostGte: 7 },
          cost: { kind: "suspend", target: { filter: { isSelfRef: true } } },
          actions: [
            { kind: "Draw", amount: 1 },
            { kind: "GainMemory", amount: 1 },
            { kind: "PlaceUnder", underFilter: { isTriggerSource: true }, faceDown: true },
          ],
        },
      ],
    });
  });
  it.each([0, 2, 3, 4])("sets memory to three only when starting at two or less (%s)", async (memory) => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX9-068", as: "source" }] } });
    s.state.memory = memory;

    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("source"));

    expect(s.state.memory).toBe(Math.max(3, memory));
  });
  it("suspends, draws, gains memory, and places a hand card face-down under a qualifying Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-068", as: "source" },
            { card: "EX9-065", as: "subject" },
          ],
          hand: ["BT1-009"],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("subject").permanentId });
    await settle(() => s.perm("source").isSuspended && s.state.memory === 1 && s.perm("subject").stack.length === 1);

    expect(s.perm("source").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
    expect(s.perm("subject").stack[0]).toMatchObject({ cardId: "BT1-009", faceUp: false });
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-010")).toBe(true);
  });
  it("does not respond to a Digimon with play cost below seven", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-068", as: "source" },
            { card: "BT1-009", as: "subject" },
          ],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("subject").permanentId });

    expect(s.perm("source").isSuspended).toBe(false);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });
  it("plays itself from security without paying", async () => {
    const s = setupEngine({ 0: { security: [{ card: "EX9-068", as: "source" }] } });
    s.inst("source").faceUp = true;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("source"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-068"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-068")).toBe(true);
    expect(s.state.players[0]!.security.some((card) => card.cardId === "EX9-068")).toBe(false);
  });
});
