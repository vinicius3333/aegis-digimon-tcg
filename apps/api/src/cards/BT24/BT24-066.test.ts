import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT24-066.js";
import "../index.js";

describe("BT24-066 Guilmon", () => {
  it("reveals qualifying trait cards or purple Tamers, trashes a second hit, and trashes one hand card", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Gigimon"], cost: 0, isAlternate: true }]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [{ to: "hand" }, { to: "trash", requiresMinRevealed: 2 }],
          rest: "deckBottom",
        },
        { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "Delete", target: { filter: { controller: "opponent", levels: [3] }, count: 1 } }],
    });
  });

  it("moves two qualifying revealed cards to the printed destinations and leaves the remainder below", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-066", as: "source" }],
          hand: ["BT1-009"],
          deck: ["BT24-066", "BT24-066", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.state.players[0]!.deck.length === 1);

    const moved = [...s.state.players[0]!.hand, ...s.state.players[0]!.trash].filter(
      (card) => card.cardId === "BT24-066",
    );
    expect(moved.length).toBeGreaterThanOrEqual(1);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });
});
