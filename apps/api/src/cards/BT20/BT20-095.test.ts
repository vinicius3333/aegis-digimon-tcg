import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-095.js";
import "./index.js";
import "./BT20-010.js";
import "./BT20-049.js";

describe("BT20-095 Fellowship of Hope's Keepers", () => {
  it("reveals and places itself for the Main effect", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Main" && !entry.keywords)).toMatchObject({
      actions: [{ kind: "RevealAdd", revealCount: 3 }, { kind: "PlaceInBattleAreaSelf" }],
    });
  });

  it("only offers the breeding-area digivolution as Delay", () => {
    const delay = compiled.effects.find(
      (entry) => entry.trigger === "Main" && entry.keywords?.some((k) => k.keyword === "Delay"),
    );
    expect(delay).toMatchObject({
      actions: [
        {
          kind: "Digivolve",
          target: { filter: { zone: "breeding", levelComparison: { op: "gte", value: 3 } } },
          into: { nameOrTrait: [{ tokens: ["Chronicle"], match: "trait" }] },
          cost: { kind: "moveToBattleArea" },
          abortOnDecline: true,
        },
      ],
    });
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")?.actions).toHaveLength(1);
  });

  it("naturally reveals three cards, adds one Chronicle, and places itself", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT20-095", as: "option" }],
          battleArea: ["BT20-047"],
          deck: ["BT20-010", "BT20-047", "BT20-049"],
        },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    const optionId = s.inst("option").instanceId;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId));

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT20-010");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });
});
