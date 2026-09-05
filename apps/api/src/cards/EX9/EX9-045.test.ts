import { describe, expect, it } from "vitest";
import { EffectTiming, type PlayerState } from "@aegis/shared";
import { compiled } from "./EX9-045.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("EX9-045", () => {
  it.each([
    { leaving: "BT1-009", decline: false },
    { leaving: "EX9-040", decline: true },
  ])(
    "preserves the hand candidate for a non-WG departure or refusal: $leaving / $decline",
    async ({ leaving, decline }) => {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "EX9-045" }, { card: leaving, as: "leaving" }], hand: ["EX9-040"] },
        },
        { autoAcceptOptional: !decline, autoDeclineOptional: decline, autoSelectCards: true },
      );
      await advance(s.engine).verb.deletePermanent([s.perm("leaving").permanentId]);
      await settle();
      expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX9-045"]);
      expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX9-040"]);
      expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual([leaving]);
      expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(decline ? 1 : 0);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );

  it("does not play a WG replacement after a real losing security battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-045" }, { card: "BT21-033", as: "attacker" }], hand: ["EX9-040"] },
        1: { security: ["BT1-019"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX9-045"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX9-040"]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT21-033"]);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([false, true])("resolves free WG play and the return tail after real evolution, DNA: %s", async (dna) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-080", as: "base" }, ...(dna ? [{ card: "BT1-044", as: "partner" }] : [])],
          hand: [{ card: "EX9-045", as: "evo" }, "EX9-040", "EX9-044", "BT1-009"],
          deck: ["BT1-046"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
          deck: ["BT1-045"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(
        0,
        dna
          ? {
              type: "dnaDigivolve",
              materialPermanentIds: [s.perm("base").permanentId, s.perm("partner").permanentId],
              instanceId: s.inst("evo").instanceId,
            }
          : {
              type: "digivolve",
              permanentId: s.perm("base").permanentId,
              instanceId: s.inst("evo").instanceId,
            },
      ),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX9-045", "EX9-040"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX9-044", "BT1-009", "BT1-046"]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.memory).toBe(dna ? 5 : 0);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(
      dna ? [] : ["BT1-009", "BT1-010"],
    );
    expect(s.state.players[1]!.deck.map(({ cardId }) => cardId)).toEqual(
      dna ? ["BT1-045", "BT1-009", "BT1-010"] : ["BT1-045"],
    );
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([
    ["BT1-080", "BT1-044"],
    ["BT1-080", "BT10-082"],
    ["BT1-062", "BT1-044"],
    ["BT1-062", "BT10-082"],
    ["EX9-044", "EX9-044"],
  ])("DNA digivolves eligible level-6 %s + %s for zero memory", async (left, right) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: left, as: "green", suspended: true },
            { card: right, as: "blue", suspended: true },
          ],
          hand: [{ card: "EX9-045", as: "dna" }],
          deck: ["BT1-009"],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("green").permanentId, s.perm("blue").permanentId],
        instanceId: s.inst("dna").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX9-045"]);
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.battleArea[0]!.isSuspended).toBe(false);
    expect(s.state.players[0]!.battleArea[0]!.stack.map(({ cardId }) => cardId).sort()).toEqual([left, right].sort());
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it.each([
    ["EX9-044", "EX9-042"],
    ["BT1-080", "BT1-080"],
    ["BT1-044", "BT10-082"],
  ])("rejects DNA materials with wrong level or color: %s + %s", async (left, right) => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: left, as: "left" },
          { card: right, as: "right" },
        ],
        hand: [{ card: "EX9-045", as: "dna" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("left").permanentId, s.perm("right").permanentId],
        instanceId: s.inst("dna").instanceId,
      }).ok,
    ).toBe(false);
    await settle();
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([left, right]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX9-045"]);
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it("has Alliance and Blocker", () => {
    const statics = compiled.effects?.filter((entry) => entry.keywords?.length);
    expect(statics?.flatMap((entry) => entry.keywords)).toEqual(
      expect.arrayContaining([
        { keyword: "Alliance", raw: "＜Alliance＞" },
        { keyword: "Blocker", raw: "＜Blocker＞" },
      ]),
    );
  });
  it("plays a WG Digimon costing seven or less from hand on digivolution", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      target: { filter: { playCostLte: 7 } },
    }));
  it("returns up to two opponent Digimon to the bottom of the deck during DNA digivolution", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")).toMatchObject({
      actions: [
        { kind: "PlayWithoutCost" },
        { kind: "Return", target: { count: 2, upTo: true }, to: "deckBottom", condition: { kind: "isDnaDigivolving" } },
      ],
    }));
  it("uses a live leave-play replacement for the all-turns WG rescue", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "otherThanBattle",
          actions: [{ kind: "PlayWithoutCost", from: ["hand"], payCost: false }],
        },
      ],
    }));
  it("plays an eligible WG card from hand without cost when digivolving", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX9-045", as: "source" }], hand: ["EX9-040"] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const player = s.state.players[0] as PlayerState;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => player.battleArea.some((permanent) => permanent.topCard.cardId === "EX9-040"));
    expect(player.battleArea.some((permanent) => permanent.topCard.cardId === "EX9-040")).toBe(true);
  });

  it("plays one replacement WG without preventing either departure and cannot repeat that turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-045", as: "source" },
            { card: "EX9-042", as: "leaving" },
          ],
          hand: ["EX9-040", "EX9-040"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("leaving").permanentId]);
    await settle();
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-040")).toBe(true);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX9-040"]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["EX9-042"]);
    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "EX9-040")!;
    await advance(s.engine).verb.deletePermanent([played.permanentId]);
    await settle();
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX9-045"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX9-040"]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["EX9-042", "EX9-040"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("uses printed Blocker to intercept an attack and preserve its controller's security", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "attacker" }], security: ["BT1-045"] },
      1: { battleArea: [{ card: "EX9-045", as: "blocker" }], security: ["BT1-045"] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("blocker"), "Blocker")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 1);
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.perm("blocker").isSuspended).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("uses printed Alliance to win a real attack by suspending another Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX9-045", as: "attacker" },
          { card: "BT1-009", as: "ally" },
        ],
        security: ["BT1-045"],
      },
      1: {
        battleArea: [{ card: "BT10-086", as: "defender", suspended: true }],
        security: ["BT1-045"],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("attacker"), "Alliance")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
    expect(s.events.find((event) => event.kind === "alliancePrompt")).toMatchObject({
      permanentId: s.perm("attacker").permanentId,
      eligibleAllyIds: [s.perm("ally").permanentId],
    });
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("ally").permanentId })).toEqual({
      ok: true,
    });
    await settle();

    // 15,000 DP loses to 16,000 without Alliance; the real +3,000 boost makes the attack win.
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("attacker").permanentId),
    ).toBe(true);
    expect(s.perm("ally").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT10-086");
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("returns up to two opposing Digimon to deck bottom only during DNA digivolution", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-045", as: "source" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
          deck: ["BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("source"), { isDnaDigivolve: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT1-011", "BT1-009", "BT1-010"]);
  });
});
