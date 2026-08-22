import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "./EX12-033.js";

describe("EX12-033 Amphimon", () => {
  it("maps both evolution routes, all three shared timings, and the DS color waiver", () => {
    const compiled = registeredCompiledCards.get("EX12-033")!;
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, texts: ["Jellymon"], cost: 3, isAlternate: true },
      { traits: ["DS"], cost: 3, isAlternate: true, level: 5 },
    ]);
    for (const trigger of ["WhenDigivolving", "WhenAttacking", "Counter"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "ModifyDP",
            optional: true,
            amount: -4000,
            duration: "untilYourTurnEnd",
            cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" }, count: 3, upTo: true } },
            scaling: { per: 1, usePaidCount: true, unit: "cards" },
          },
        ],
      });
    }
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: {
            nameOrTrait: [
              { tokens: ["Jellymon"], match: "text" },
              { tokens: ["DS"], match: "trait" },
            ],
          },
          actions: [{ kind: "Prevent", cost: { kind: "return", target: { filter: { zone: "trash" }, count: 3 } } }],
        },
      ],
    });
    expect(
      compiled.effects.find(
        (effect) =>
          effect.trigger === "Static" && effect.actions?.some((action) => action.kind === "WaiveColorRequirement"),
      ),
    ).toMatchObject({
      actions: [
        {
          kind: "WaiveColorRequirement",
          condition: { kind: "youHave", filter: { nameOrTrait: [{ tokens: ["DS"], match: "trait" }] } },
        },
      ],
    });
    expect(compiled.effects.find((effect) => effect.trigger === "Main")).toMatchObject({
      actions: [
        { kind: "TrashDigivolution", amount: 4, scope: "acrossDigimon", fromTop: false },
        {
          kind: "Return",
          to: "hand",
          optional: true,
          target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"], digivolutionCards: "none" } },
        },
      ],
    });
  });

  it("scales -4000 by the number of hand cards the effect actually trashed", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-033", as: "source" }], hand: ["BT1-001", "BT1-002", "BT1-003"] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 20000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => s.perm("opponent").currentDP === 8000);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.perm("opponent").currentDP).toBe(8000);
  });

  it("trashes four cards across opponent Digimon/Tamer stacks and returns an empty Tamer", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-033", as: "ds" }], hand: [{ card: "EX12-033", as: "option" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "stacked", under: ["BT1-001", "BT1-002"] },
            { card: "BT1-009", as: "stacked2", under: ["BT1-003", "BT1-004"] },
            { card: "BT1-064", as: "emptyTamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" } as never),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-064") === false,
    );

    expect(
      s.state.players[1]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "BT1-009").every(
        (permanent) => permanent.stack.length === 0,
      ),
    ).toBe(true);
    expect(s.state.players[1]!.trash).toHaveLength(4);
    expect(s.state.players[1]!.hand.some((card) => ["BT1-009", "BT1-064"].includes(card.cardId))).toBe(true);
  });

  it("prevents a matching Digimon from leaving by returning exactly three trash cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-033", as: "source" }], trash: ["BT1-009", "BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], "byEffect");

    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("source").permanentId),
    ).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-009", "BT1-010", "BT1-011"]),
    );
  });
});
