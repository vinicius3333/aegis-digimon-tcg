import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-017.js";
import "../index.js";

describe("EX5-017 Lekismon", () => {
  it("reveals three and adds Night Claw plus Light Fang/Galaxy cards on play and digivolving", () => {
    const effects = compiled.effects?.filter(
      (entry) => entry.trigger === "OnPlay" || entry.trigger === "WhenDigivolving",
    );
    expect(effects).toHaveLength(2);
    expect(effects?.[0]?.actions?.[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      rest: "deckBottom",
      add: [
        { filter: { nameOrTrait: [{ match: "trait", tokens: ["Night Claw"] }] } },
        { filter: { nameOrTrait: [{ match: "trait", tokens: ["Light Fang", "Galaxy"] }] } },
      ],
    });
  });
  it("grants itself 2000 DP during the opponent's turn when inherited", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "OpponentsTurn",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent", target: { filter: { isSelfRef: true } } }],
    });
  });

  it("adds one card from each matching trait group on play and bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX5-017", as: "lekismon" }],
          deck: ["EX5-007", "EX5-016", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lekismon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX5-017"));

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["EX5-007", "EX5-016"]));
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });

  it("adds the available trait match even when the other reveal group is absent", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX5-017", as: "lekismon" }],
          deck: ["EX5-007", "BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lekismon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX5-017"));

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX5-007");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).not.toContain("BT1-009");
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);
  });

  it("applies the inherited 2000 DP only during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX5-017"] }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(5_000);

    s.state.turnSeat = 0;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(3_000);
  });
});
