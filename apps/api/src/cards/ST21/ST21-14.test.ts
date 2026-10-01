import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
describe("ST21-14", () => {
  it("reveals three, adds one ADVENTURE card, bottoms the rest, and places itself", () => {
    const main = (runtimeCompiledCard("ST21-14")?.effects ?? []).find((effect) => effect.trigger === "Main");
    expect(main?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" });
    expect(irNode(main?.actions[0]!).add[0]!.filter.nameOrTrait).toEqual([{ tokens: ["ADVENTURE"], match: "trait" }]);
    expect(main?.actions[1]).toMatchObject({ kind: "PlaceInBattleAreaSelf" });
  });
  it("keeps Delay memory and security placement", () => {
    const effects = runtimeCompiledCard("ST21-14")?.effects ?? [];
    expect(effects.some((effect) => effect.keywords?.some((keyword) => keyword.keyword === "Delay"))).toBe(true);
    expect(effects.find((effect) => effect.trigger === "Security")).toMatchObject({ isSecurity: true });
  });

  it("reveals three cards, adds an ADVENTURE card, and places itself in the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST21-13", as: "adventureTamer" }],
          hand: [{ card: "ST21-14", as: "option" }],
          deck: ["ST21-10", "BT1-009", "BT1-045"],
        },
        1: { security: ["BT1-003"] },
      },
      { autoSelectCards: true, autoOrderCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "ST21-14"));
    const hand = s.state.players[0]!.hand;
    expect(hand.filter((card) => card.cardId === "ST21-10")).toHaveLength(1);
    expect(hand.filter((card) => card.cardId === "ST21-10")).toHaveLength(1);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-045"]);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "ST21-14")).toBe(true);
  });
});

describe("ST21-14 Believe in Our Friendship — KB Q&A rulings", () => {
  it("ignores its color requirement for an ADVENTURE Digimon in the breeding area (Q4485)", async () => {
    const playWithBreeding = async (breedingCardId: string) => {
      const s = setupEngine(
        {
          0: {
            breeding: breedingCardId,
            hand: [{ card: "ST21-14", as: "friendship" }],
            deck: ["ST21-10", "BT1-009", "BT1-045"],
          },
        },
        { autoSelectCards: true, autoOrderCards: true },
      );
      s.state.memory = 3;
      await s.ready();
      return { s, result: s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("friendship").instanceId }) };
    };

    const adventure = await playWithBreeding("ST21-02");
    expect(adventure.result).toEqual({ ok: true });
    await settle(() =>
      adventure.s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "ST21-14"),
    );
    expect(adventure.s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["ST21-10"]);

    const nonAdventure = await playWithBreeding("ST2-03");
    expect(nonAdventure.result).toEqual({ ok: false, reason: "color-requirement-unmet" });
    expect(nonAdventure.s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["ST21-14"]);
  });
});
