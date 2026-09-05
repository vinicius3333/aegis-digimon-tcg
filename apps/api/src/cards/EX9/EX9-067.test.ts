import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-067.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-067", () => {
  it.each([
    { evolution: "BT13-039", cost: 3, decline: true },
    { evolution: "BT1-051", cost: 2, decline: false },
  ])(
    "preserves Mirai and the hand when declining or evolving into non-Puppet $evolution",
    async ({ evolution, cost, decline }) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT1-046", as: "host" },
              { card: "EX9-067", as: "tamer" },
            ],
            hand: [{ card: evolution, as: "evo" }, "BT13-035"],
            deck: ["BT1-048", "BT1-049"],
          },
        },
        { autoDeclineOptional: decline, autoAcceptOptional: !decline, autoSelectCards: true },
      );
      s.state.memory = 10;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("host").permanentId,
          instanceId: s.inst("evo").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle();
      expect(s.perm("host").topCard.cardId).toBe(evolution);
      expect(s.perm("tamer").topCard.cardId).toBe("EX9-067");
      expect(s.state.players[0]!.battleArea).toHaveLength(2);
      expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT13-035", "BT1-048"]);
      expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-049"]);
      expect(s.state.memory).toBe(10 - cost);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );
  it.each([
    { copies: 1, played: "BT13-039", cost: 2 },
    { copies: 2, played: "BT13-039", cost: 2 },
    { copies: 1, played: "EX11-060", cost: 1 },
    { copies: 2, played: "EX11-060", cost: 1 },
  ])(
    "Q4827 keeps $copies copies from stacking discounts on $played after a real Puppet evolution",
    async ({ copies, played, cost }) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT1-046", as: "host" },
              ...Array.from({ length: copies }, () => ({ card: "EX9-067" })),
            ],
            hand: [
              { card: "BT13-039", as: "evo" },
              { card: played, as: "played" },
            ],
            deck: ["BT1-048", "BT1-049"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
      );
      s.state.memory = 10;
      const playedId = s.inst("played").instanceId;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("host").permanentId,
          instanceId: s.inst("evo").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle();
      expect(s.perm("host").topCard.cardId).toBe("BT13-039");
      expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT1-046"]);
      expect(
        s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.instanceId === playedId),
      ).toHaveLength(1);
      expect(s.state.memory).toBe(10 - 3 - cost);
      expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-048"]);
      expect(s.state.players[0]!.deck[0]!.cardId).toBe("BT1-049");
      expect(s.state.players[0]!.deck.at(-1)?.cardId).toBe("EX9-067");
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );

  it.each(["BT13-035", "EX9-067"])(
    "searches independent Puppet/LIBERATOR candidate %s and puts leftovers below an unrevealed anchor",
    async (candidate) => {
      const s = setupEngine(
        {
          0: { hand: [{ card: "EX9-067", as: "card" }], deck: ["BT1-009", candidate, "BT1-010", "BT1-048"] },
        },
        { autoSelectCards: true, autoOrderCards: true },
      );
      s.state.memory = 10;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("card").instanceId })).toEqual({
        ok: true,
      });
      await settle();
      expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual([candidate]);
      expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-048", "BT1-009", "BT1-010"]);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );

  it("returns all nonmatching revealed cards below the unrevealed anchor", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX9-067", as: "card" }], deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-048"] },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("card").instanceId })).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-048", "BT1-009", "BT1-010", "BT1-011"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it("reveals three and adds a Puppet LIBERATOR trait card", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      rest: "deckBottom",
      add: [{ to: "hand", filter: { nameOrTrait: [{ tokens: ["Puppet", "LIBERATOR"], match: "trait" }] } }],
    }));
  it("returns itself to deck bottom to play a Puppet or Arisa after a Puppet digivolves", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          cost: { kind: "return", to: "deckBottom" },
          actions: [{ kind: "PlayWithoutCost", from: ["hand"], reduceCostBy: 3 }],
        },
      ],
    }));
  it("plays itself from security without paying", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false }],
    }));
  it("requires a Puppet digivolution and returns this Tamer before the optional reduced-cost play", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenOneOfYoursDigivolves",
      sourceFilter: { controllerDefault: "mine", kind: ["Digimon"] },
      digivolveIntoFilter: { nameOrTrait: [{ tokens: ["Puppet"], match: "trait" }] },
      cost: { kind: "return", to: "deckBottom", target: { isSelf: true, count: 1 } },
      actions: [
        {
          kind: "PlayWithoutCost",
          optional: true,
          from: ["hand"],
          payCost: true,
          reduceCostBy: 3,
          target: {
            count: 1,
            filter: {
              controller: "mine",
              or: [
                { kind: ["Tamer"], nameOrTrait: [{ tokens: ["Arisa Kinosaki"], match: "name" }] },
                { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Puppet"], match: "trait" }] },
              ],
            },
          },
        },
      ],
    }));
  it("does not add an unprinted once-per-turn restriction", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).not.toHaveProperty("frequency"));

  it("reveals three and adds a Puppet card while returning the rest to the deck bottom", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX9-067", as: "source" }], deck: ["BT1-009", "EX9-024", "BT1-010"] } },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(
      () => s.state.players[0]!.hand.some((card) => card.cardId === "EX9-024") && s.state.players[0]!.deck.length === 2,
      40,
    );
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX9-024")).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });
  it("returns this Tamer to the deck bottom and plays a Puppet after its digivolution trigger", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-067", as: "source" },
            { card: "BT13-035", as: "subject" },
          ],
          hand: ["BT13-035"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );

    await advance(s.engine).fireSubTrigger("whenOneOfYoursDigivolves", {
      subjectPermanentId: s.perm("subject").permanentId,
    });
    await settle(
      () =>
        s.state.players[0]!.deck.at(-1)?.cardId === "EX9-067" &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-035"),
    );

    expect(s.state.players[0]!.deck.at(-1)?.cardId).toBe("EX9-067");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-035")).toBe(true);
  });
  it("plays itself from security without paying", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "EX9-067", as: "source" }] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.inst("source").faceUp = true;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("source"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-067"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-067")).toBe(true);
    expect(s.state.players[0]!.security.some((card) => card.cardId === "EX9-067")).toBe(false);
  });
});
