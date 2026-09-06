import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-061.js";
import "./index.js";

describe("BT20-061 Impmon", () => {
  it("reveals three and adds one qualifying trait card and one Yuuki, bottoming the rest", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")).toMatchObject({
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          rest: "deckBottom",
          add: [
            {
              filter: { nameOrTrait: [{ tokens: ["Evil", "Dark Dragon", "Evil Dragon"], match: "trait" }] },
              count: 1,
              to: "hand",
            },
            { filter: { nameOrTrait: [{ tokens: ["Yuuki"], match: "name" }] }, count: 1, to: "hand" },
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

  it("publishes the printed stats and free Yaamon evolution route", async () => {
    expect(getCardDefinition("BT20-061")).toMatchObject({ level: 3, playCost: 3, dp: 1000 });
    expect(compiled.digivolutionRequirement).toContainEqual({ names: ["Yaamon"], cost: 0, isAlternate: true });
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX7-006", as: "yaamon" }],
        hand: [{ card: "BT20-061", as: "impmon" }],
        deck: ["BT20-047"],
      },
    });
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("yaamon").permanentId,
        instanceId: s.inst("impmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("yaamon").topCard?.cardId === "BT20-061");
    expect(s.state.memory).toBe(0);
    expect(s.perm("yaamon").stack.map((card) => card.cardId)).toContain("EX7-006");
  });

  it("on play adds one Evil-family card and Yuuki while bottoming the nonmatch", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT20-061", as: "impmon" }],
          deck: [
            { card: "BT20-069", as: "darkDragon" },
            { card: "BT20-090", as: "yuuki" },
            { card: "BT20-047", as: "machine" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("impmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand.map((card) => card.cardId).sort()).toEqual(["BT20-069", "BT20-090"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT20-047"]);
  });

  it("on play with no qualifying reveal leaves all three cards on the deck bottom", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT20-061", as: "impmon" }],
          deck: ["BT20-047", "BT20-048", "BT20-049"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("impmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 3 && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT20-047", "BT20-048", "BT20-049"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).not.toContain("BT20-047");
  });

  it("applies inherited DP only on its controller's turn and only while underneath a host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT20-069", under: ["BT20-061"], as: "host" },
          { card: "BT20-061", as: "standalone" },
        ],
      },
    });
    s.state.turnSeat = 0;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(7000);
    expect(s.perm("standalone").currentDP).toBe(1000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(5000);
  });
});
