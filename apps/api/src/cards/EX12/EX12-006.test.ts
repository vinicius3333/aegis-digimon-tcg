import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("EX12-006 Kakamon", () => {
  it("trashes an SW card, draws one, and gains one memory at the start of main phase", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-006", as: "source" }],
          hand: [{ card: "EX12-022", as: "cost" }],
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

  it("may decline the SW hand-trash cost and gets neither benefit", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-006", as: "source" }],
          hand: [{ card: "EX12-022", as: "cost" }],
          deck: ["BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 0;

    const firing = advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("source"));
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const pending = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await firing;

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.memory).toBe(0);
  });

  it("does not draw or gain memory when no SW hand card can pay the cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-006", as: "source" }],
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

  it("gives its host +2000 DP only on its controller's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX12-006", as: "host", under: ["EX12-006"] },
          { card: "EX12-006", as: "other" },
        ],
      },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(4000);
    expect(s.perm("other").currentDP).toBe(2000);

    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(2000);

    s.state.turnSeat = 0;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(4000);
  });

  it("encodes one SW hand-trash cost shared by Draw 1 and Gain Memory 1", () => {
    const effect = registeredCompiledCards.get("EX12-006")!.effects[0]!;
    expect(effect.trigger).toBe("StartOfYourMainPhase");
    expect(effect.actions).toHaveLength(2);
    expect(effect.actions[0]).toMatchObject({
      kind: "Draw",
      amount: 1,
      optional: true,
      abortOnDecline: true,
      cost: {
        kind: "trash",
        target: {
          count: 1,
          filter: { zone: "hand", controller: "mine", nameOrTrait: [{ match: "trait", tokens: ["SW"] }] },
        },
      },
    });
    expect(effect.actions[1]).toEqual({ kind: "GainMemory", amount: 1 });
    expect(effect.isInherited).not.toBe(true);
    expect(registeredCompiledCards.get("EX12-006")!.effects[1]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }],
    });
  });

  it("does not activate its start-of-main effect during the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-006", as: "source" }],
          hand: [{ card: "EX12-022", as: "cost" }],
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

  it("digivolves for 0 by the standard red route or the level-2 Shambala alternate", async () => {
    expect(digivolutionRequirementsFor("EX12-006")).toEqual([
      { level: 2, traits: ["Shambala"], cost: 0, isAlternate: true },
    ]);

    for (const [baseCardId, useAlternateCost] of [
      ["BT1-001", false],
      ["EX12-004", true],
    ] as const) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: baseCardId, as: "base" }],
          hand: [{ card: "EX12-006", as: "kakamon" }],
        },
      });
      s.state.memory = 0;

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("kakamon").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "EX12-006");
      expect(s.state.memory).toBe(0);
    }
  });

  it("rejects alternate evolution over an off-color level-2 card without Shambala", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-005", as: "base" }],
        hand: [{ card: "EX12-006", as: "kakamon" }],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("kakamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("does not accept a Shambala hand card that lacks the SW trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-006", as: "source" }],
          hand: [{ card: "EX12-011", as: "nearMatch" }],
          deck: ["BT1-010"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("source"));
    await settle();

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("nearMatch").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.memory).toBe(0);
  });
});
