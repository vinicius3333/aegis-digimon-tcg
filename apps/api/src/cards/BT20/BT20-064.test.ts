import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-064.js";
import "./index.js";

describe("BT20-064 Loogamon", () => {
  it("reveals three and adds one SoC/SEEKERS card and one Eiji Nagasumi, bottoming the rest", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")).toMatchObject({
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          rest: "deckBottom",
          add: [
            { filter: { nameOrTrait: [{ tokens: ["SoC", "SEEKERS"], match: "trait" }] }, count: 1, to: "hand" },
            { filter: { nameOrTrait: [{ tokens: ["Eiji Nagasumi"], match: "name" }] }, count: 1, to: "hand" },
          ],
        },
      ],
    });
  });

  it("grants inherited +2000 DP during its controller's turn", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "ModifyDP",
          amount: 2000,
          duration: "permanent",
          target: { filter: { isSelfRef: true }, isSelf: true },
        },
      ],
    });
  });

  it("publishes stats and both exact zero-cost alternate evolution routes", async () => {
    expect(getCardDefinition("BT20-064")).toMatchObject({ level: 3, playCost: 3, dp: 1000 });
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Bowmon"], cost: 0, isAlternate: true },
      { level: 2, traits: ["SEEKERS"], cost: 0, isAlternate: true },
    ]);
    for (const [base, requirementIndex] of [
      ["BT14-006", 0],
      ["BT20-003", 1],
    ] as const) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: base, as: "base" }],
          hand: [{ card: "BT20-064", as: "loogamon" }],
          deck: ["BT20-047"],
        },
      });
      s.state.memory = 0;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("loogamon").instanceId,
          alternateRequirementIndex: requirementIndex,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "BT20-064");
      expect(s.perm("base").stack.map((card) => card.cardId)).toEqual([base]);
      expect(s.state.memory).toBe(0);
    }
  });

  it("on play adds a SoC/SEEKERS card and Eiji while bottoming the nonmatch", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT20-064", as: "loogamon" }],
          deck: ["BT20-070", "BT14-087", "BT20-047"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("loogamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand.map((card) => card.cardId).sort()).toEqual(["BT14-087", "BT20-070"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT20-047"]);
  });

  it("applies inherited +2000 only underneath a host on its controller's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT20-070", under: ["BT20-064"], as: "host" },
          { card: "BT20-064", as: "standalone" },
        ],
      },
    });
    s.state.turnSeat = 0;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(8000);
    expect(s.perm("standalone").currentDP).toBe(1000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(6000);
  });

  it("returns all revealed cards to the bottom when neither printed target exists", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT20-064", as: "loogamon" }],
          deck: ["BT20-047", "BT20-057", "BT20-009"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("loogamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 0 && s.state.players[0]!.deck.length === 3);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT20-047", "BT20-057", "BT20-009"]);
  });
});
