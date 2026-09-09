import { describe, expect, it } from "vitest";
import { advance } from "../testkit/advance.js";
import { setupEngine } from "../testkit/harness.js";
import "../../cards/index.js";

describe("BT10-077 hand-add watcher mechanism", () => {
  it("trashes exactly the cards added by an effect draw", async () => {
    const s = setupEngine(
      {
        0: {
          hand: ["BT1-009"],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [{ card: "BT10-077", as: "mad", under: ["BT1-104"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      (
        s.engine as unknown as { subTriggers: { subscriptionsFor(event: string): unknown[] } }
      ).subTriggers.subscriptionsFor("whenEffectAddsToOpponentHand").length,
    ).toBe(1);

    await advance(s.engine).verb.drawByEffect(0, 5);
    expect({
      hand: s.state.players[0]!.hand.map((card) => card.cardId),
      opponentTrash: s.state.players[0]!.trash.map((card) => card.cardId),
      sourceTrash: s.state.players[1]!.trash.map((card) => card.cardId),
    }).toEqual({
      hand: ["BT1-014"],
      opponentTrash: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
      sourceTrash: ["BT1-104"],
    });
  });
});
