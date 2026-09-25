import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("EX12-008 ToyAgumon", () => {
  it("pays a Puppet-or-ME hand cost and draws at the public start of its Main Phase", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-008", as: "source" }],
          hand: [
            { card: "EX12-041", as: "cost" },
            { card: "BT1-009", as: "unrelated" },
          ],
          deck: [{ card: "BT1-010", as: "drawn" }, "BT1-011"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 0;
    const costId = s.inst("cost").instanceId;
    const unrelatedId = s.inst("unrelated").instanceId;
    const drawnId = s.inst("drawn").instanceId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([costId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([unrelatedId, drawnId]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-011"]);
    expect(s.state.memory).toBe(1);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("keeps the paid card and benefits unchanged on refusal or without a match, but gains memory after an empty-deck payment", async () => {
    const declined = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-008", as: "source" }],
          hand: [{ card: "BT1-038", as: "cost" }],
          deck: ["BT1-010"],
        },
      },
      { autoDeclineOptional: true },
    );
    declined.state.memory = 0;
    const declinedCostId = declined.inst("cost").instanceId;
    const declinedLoop = declined.engine.startTurnLoop();
    await advance(declined.engine).waitForMainPhase(0);
    expect(declined.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([declinedCostId]);
    expect(declined.state.players[0]!.trash).toHaveLength(0);
    expect(declined.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(declined.state.memory).toBe(0);
    expect(declined.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await declinedLoop;

    const unpayable = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-008", as: "source" }],
          hand: [{ card: "BT1-009", as: "wrong" }],
          deck: ["BT1-010"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    unpayable.state.memory = 0;
    const wrongId = unpayable.inst("wrong").instanceId;
    const unpayableLoop = unpayable.engine.startTurnLoop();
    await advance(unpayable.engine).waitForMainPhase(0);
    expect(unpayable.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([wrongId]);
    expect(unpayable.state.players[0]!.trash).toHaveLength(0);
    expect(unpayable.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(unpayable.state.memory).toBe(0);
    expect(unpayable.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await unpayableLoop;

    const emptyDeck = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-008", as: "source" }],
          hand: [{ card: "BT1-038", as: "cost" }],
          deck: [],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    emptyDeck.state.memory = 0;
    const emptyDeckCostId = emptyDeck.inst("cost").instanceId;
    const emptyDeckLoop = emptyDeck.engine.startTurnLoop();
    await advance(emptyDeck.engine).waitForMainPhase(0);
    expect(emptyDeck.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([emptyDeckCostId]);
    expect(emptyDeck.state.players[0]!.hand).toHaveLength(0);
    expect(emptyDeck.state.players[0]!.deck).toHaveLength(0);
    expect(emptyDeck.state.memory).toBe(1);
    expect(emptyDeck.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await emptyDeckLoop;
  });

  it("trashes a Puppet/ME card, draws one, and gains one memory at the start of main phase", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-008", as: "source" }],
          hand: [{ card: "EX12-041", as: "cost" }],
          deck: ["BT1-009"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("source"));
    await settle(() => s.state.players[0]!.deck.length === 0);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(s.state.memory).toBe(1);
  });

  it("may decline the Puppet/ME hand-trash cost and gets neither benefit", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-008", as: "source" }],
          hand: [{ card: "BT1-038", as: "cost" }],
          deck: ["BT1-010"],
        },
      },
      {},
    );
    s.state.memory = 0;

    const firing = advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("source"));
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const pending = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await firing;

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.memory).toBe(0);
  });

  it("accepts a Puppet-only cost and still gains memory when the empty deck prevents drawing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-008", as: "source" }],
          hand: [{ card: "BT1-038", as: "cost" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("source"));
    await settle();

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.memory).toBe(1);
  });

  it("does not draw or gain memory without a qualifying Puppet/ME card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-008", as: "source" }],
          hand: ["BT1-009"],
          deck: ["BT1-010"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("source"));
    await settle();

    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.memory).toBe(0);
  });

  it("grants Raid only while inherited by its host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX12-008", as: "host", under: ["EX12-008"] },
          { card: "EX12-008", as: "standalone" },
        ],
      },
    });
    await s.ready();

    const continuous = (s.engine as unknown as { continuous: { hasKeyword(id: string, keyword: string): boolean } })
      .continuous;
    expect(continuous.hasKeyword(s.perm("host").permanentId, "Raid")).toBe(true);
    expect(continuous.hasKeyword(s.perm("standalone").permanentId, "Raid")).toBe(false);
  });

  it("encodes one optional hand-trash cost shared by Draw 1 and Gain Memory 1", () => {
    const compiled = registeredCompiledCards.get("EX12-008")!;
    expect(compiled.effects[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "Draw",
          amount: 1,
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "trash",
            target: {
              count: 1,
              filter: {
                zone: "hand",
                controller: "mine",
                nameOrTrait: [{ match: "trait", tokens: ["Puppet", "ME"] }],
              },
            },
          },
        },
        { kind: "GainMemory", amount: 1 },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: [{ keyword: "Raid" }],
    });
  });

  it("does not activate its start-of-main effect during the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-008", as: "source" }],
          hand: [{ card: "EX12-041", as: "cost" }],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("source"));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.memory).toBe(0);
  });

  it("digivolves for 0 by the standard red route or the level-2 ME alternate", async () => {
    expect(digivolutionRequirementsFor("EX12-008")).toEqual([{ level: 2, traits: ["ME"], cost: 0, isAlternate: true }]);

    for (const [baseCardId, useAlternateCost] of [
      ["BT1-001", false],
      ["EX12-003", true],
    ] as const) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: baseCardId, as: "base" }],
          hand: [{ card: "EX12-008", as: "toyAgumon" }],
        },
      });
      s.state.memory = 0;

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("toyAgumon").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "EX12-008");
      expect(s.state.memory).toBe(0);
    }
  });

  it("rejects alternate evolution over an off-color level-2 card without ME", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-005", as: "base" }],
        hand: [{ card: "EX12-008", as: "toyAgumon" }],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("toyAgumon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("does not hand its start-of-main effect to a host carrying it as a digivolution card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-010", as: "host", under: ["EX12-008"] }],
          hand: [{ card: "EX12-041", as: "cost" }],
          deck: ["BT1-009"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("host"));
    await settle();

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.memory).toBe(0);
  });
});
