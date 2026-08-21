import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-020 Angoramon", () => {
  it("reveals three cards and adds the Angoramon-text card plus Ruli", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "RB1-020", as: "angoramon" }],
          deck: ["RB1-034", "RB1-022", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("angoramon"));

    expect(s.state.players[0]!.hand.filter((card) => card.cardId === "RB1-034")).toHaveLength(1);
    expect(s.state.players[0]!.hand.filter((card) => card.cardId === "RB1-022")).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["RB1-022", "BT1-009"]);
  });

  it("adds no cards when the revealed cards have no matching text or Ruli name", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "RB1-020", as: "angoramon" }], deck: ["BT1-009", "BT1-014", "BT1-015"] },
    });

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("angoramon"));

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });
});
