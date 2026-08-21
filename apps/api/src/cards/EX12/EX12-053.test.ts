import { describe, expect, it } from "vitest";
import { compiled } from "./EX12-053.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX12-053 Hagurumon", () => {
  it("reveals three and adds one matching Machine/Cyborg/Mutant and one ME card", () => {
    const action = compiled.effects.find((entry) => entry.trigger === "OnPlay")?.actions[0];

    expect(action).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" });
    expect(action).toMatchObject({
      add: [
        {
          count: 1,
          to: "hand",
          filter: { nameOrTrait: [{ match: "trait", tokens: ["Machine", "Cyborg", "Mutant"] }] },
        },
        { count: 1, to: "hand", filter: { nameOrTrait: [{ match: "trait", tokens: ["ME"] }] } },
      ],
    });
  });

  it("retains inherited Blocker and the alternate ME evolution", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Blocker",
      raw: "＜Blocker＞",
    });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["ME"], cost: 0, isAlternate: true }]);
  });

  it("reveals three cards, adds distinct Machine and ME cards, and bottoms the remainder", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX12-053", as: "hagurumon" }],
          deck: ["EX12-054", "EX12-008", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hagurumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "EX12-054"));

    const player = s.state.players[0]!;
    expect(player.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["EX12-054", "EX12-008"]));
    expect(player.deck.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });
});
