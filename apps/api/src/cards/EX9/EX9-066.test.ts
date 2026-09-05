import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-066.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-066", () => {
  it("does not react when the opponent plays a Digimon even with both named own Digimon present", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-066", as: "tamer" }, "BT1-015", "BT1-036"] },
        1: { hand: [{ card: "BT1-009", as: "digimon" }] },
      },
      { autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("digimon").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(s.state.memory).toBe(8);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it.each(["BT1-015", "BT1-036", "BT1-084"])(
    "returns the independent named branch %s on real play without drawing",
    async (candidate) => {
      const s = setupEngine(
        {
          0: { hand: [{ card: "EX9-066", as: "card" }], trash: ["BT1-024", candidate], deck: ["BT1-048"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 10;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("card").instanceId })).toEqual({
        ok: true,
      });
      await settle();
      expect(s.state.memory).toBe(6);
      expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual([candidate]);
      expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-048"]);
      expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-024"]);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );

  it("Q4825 draws after explicitly refusing an available named return", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX9-066", as: "card" }], trash: ["BT1-015"], deck: ["BT1-048", "BT1-049"] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("card").instanceId })).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-048"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-049"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-015"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([
    { named: [], gain: 0 },
    { named: ["BT1-015"], gain: 1 },
    { named: ["BT1-036"], gain: 1 },
    { named: ["BT1-015", "BT1-036"], gain: 2 },
  ])("gains $gain memory on a real own Digimon play with $named", async ({ named, gain }) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-066", as: "tamer" }, ...named], hand: [{ card: "BT1-009", as: "digimon" }] },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("digimon").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.memory).toBe(8 + gain);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each(["decline", "already suspended", "accept"])(
    "Q4826 requires paying suspend for both memory clauses on real evolution (%s)",
    async (choice) => {
      const suspended = choice === "already suspended";
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "EX9-066", as: "tamer", suspended },
              "BT1-015",
              "BT1-036",
              { card: "BT1-009", as: "host" },
            ],
            hand: [{ card: "BT1-016", as: "evo" }],
            deck: ["BT1-048"],
          },
        },
        { autoDeclineOptional: choice !== "accept", autoAcceptOptional: choice === "accept" },
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
      expect(s.perm("host").topCard.cardId).toBe("BT1-016");
      expect(s.perm("tamer").isSuspended).toBe(suspended || choice === "accept");
      expect(s.state.memory).toBe(choice === "accept" ? 10 : 8);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );
  it("returns a Greymon, Garurumon, or Omnimon from trash, or draws if none was returned", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")).toMatchObject({
      actions: [
        { kind: "Return", to: "hand", bindResultAs: "returnedCard", target: { filter: { zone: "trash" } } },
        { kind: "Draw", amount: 1, condition: { kind: "bindingEmpty", ref: "returnedCard" } },
      ],
    }));
  it("reacts to own Digimon play and digivolution by suspending this Tamer and gaining memory", () => {
    const triggers = compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions ?? [];
    expect(triggers.filter((action) => action.kind === "SubTrigger")).toHaveLength(2);
    expect(triggers[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      actions: [
        { kind: "GainMemory", amount: 0 },
        { kind: "GainMemory", amount: 1 },
        { kind: "GainMemory", amount: 1 },
      ],
    });
  });
  it("requires the named trash cards and keeps the draw fallback bound to a failed return", () => {
    const onPlay = compiled.effects?.find((entry) => entry.trigger === "OnPlay");
    expect(onPlay?.actions[0]).toMatchObject({
      optional: true,
      bindResultAs: "returnedCard",
      target: {
        count: 1,
        filter: {
          zone: "trash",
          controller: "mine",
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Greymon", "Garurumon", "Omnimon"], match: "name" }],
        },
      },
    });
    expect(onPlay?.actions[1]).toMatchObject({
      kind: "Draw",
      amount: 1,
      condition: { kind: "bindingEmpty", ref: "returnedCard" },
    });
    expect(compiled.effects?.find((entry) => entry.isSecurity)).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false }],
    });
  });
  it("returns a named Digimon from trash on play", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX9-066", as: "source" }], trash: ["BT1-015"] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-015"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-015")).toBe(true);
  });
  it("draws when no named Digimon is available in trash", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX9-066", as: "source" }], deck: ["BT1-046", "BT1-048"], trash: ["BT1-024"] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-046"]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-048"]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-024"]);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX9-066"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it.each([
    ["whenPlayed", "whenPlayed"],
    ["whenOneOfYoursDigivolves", "whenOneOfYoursDigivolves"],
  ] as const)(
    "gains two memory after %s by suspending itself when both named Digimon are present",
    async (_label, event) => {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "EX9-066", as: "source" }, { card: "BT1-015", as: "greymon" }, "BT1-036"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
      );
      s.state.memory = 0;

      await advance(s.engine).fireSubTrigger(event, { subjectPermanentId: s.perm("greymon").permanentId });
      await settle(() => s.perm("source").isSuspended && s.state.memory === 2);

      expect(s.perm("source").isSuspended).toBe(true);
      expect(s.state.memory).toBe(2);
    },
  );
  it("plays itself from security without paying its cost", async () => {
    const s = setupEngine(
      {
        0: { security: ["EX9-066", "BT1-048"], trash: ["BT1-015"], deck: ["BT1-046"] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX9-066"]);
    expect(s.state.players[0]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-048"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-015"]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-046"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
