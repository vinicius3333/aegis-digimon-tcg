import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("EX12-005 Agumon", () => {
  it("models the printed hand-trash as an optional activation cost", () => {
    const action = registeredCompiledCards.get("EX12-005")!.effects[0]!.actions[0]!;
    expect(action).toMatchObject({
      kind: "Draw",
      amount: 2,
      optional: true,
      abortOnDecline: true,
      cost: { kind: "trash" },
    });
  });

  it.each([
    ["Greymon name without VB", "BT1-015"],
    ["VB trait without Greymon", "EX12-007"],
  ])("trashes a card matching %s and then draws two", async (_label, costCardId) => {
    const s = setupEngine(
      {
        0: {
          hand: ["EX12-005", { card: costCardId, as: "cost" }, "BT1-009"],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.state.players[0]!.hand[0]!.instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 0);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT1-001", "BT1-002"]));
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("may decline the hand-trash cost and therefore does not draw", async () => {
    const s = setupEngine(
      {
        0: {
          hand: ["EX12-005", { card: "EX12-007", as: "cost" }],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.state.players[0]!.hand[0]!.instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const pending = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-001", "BT1-002"]);
  });

  it("does not draw when no qualifying hand card is available for the mandatory cost", async () => {
    const s = setupEngine(
      {
        0: {
          hand: ["EX12-005", "BT1-009"],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.state.players[0]!.hand[0]!.instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-001", "BT1-002"]);
  });

  it("gives a host +2000 DP only during its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX12-010", as: "host", under: ["EX12-005"] }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(7000);

    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(5000);

    s.state.turnSeat = 0;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(7000);
  });

  it("keeps the inherited +2000 grant scoped to the host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX12-010", as: "withInherited", under: ["EX12-005"] },
          { card: "EX12-010", as: "withoutInherited" },
        ],
      },
    });
    await s.ready();

    expect(s.perm("withInherited").currentDP).toBe(7000);
    expect(s.perm("withoutInherited").currentDP).toBe(5000);
  });

  it("digivolves for 0 by the standard red route or either printed alternate route", async () => {
    expect(digivolutionRequirementsFor("EX12-005")).toEqual([
      { names: ["Koromon"], cost: 0, isAlternate: true },
      { level: 2, traits: ["VB"], cost: 0, isAlternate: true },
    ]);

    for (const [baseCardId, useAlternateCost] of [
      ["BT1-001", false],
      ["BT11-005", true],
      ["EX12-001", true],
    ] as const) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: baseCardId, as: "base" }],
          hand: [{ card: "EX12-005", as: "agumon" }],
        },
      });
      s.state.memory = 0;

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("agumon").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "EX12-005");

      expect(s.state.memory).toBe(0);
      expect(s.perm("base").stack.at(-1)?.cardId).toBe(baseCardId);
    }
  });

  it("rejects alternate evolution over a level-2 card that is neither Koromon nor VB", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-005", as: "base" }],
        hand: [{ card: "EX12-005", as: "agumon" }],
      },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("agumon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });
});
