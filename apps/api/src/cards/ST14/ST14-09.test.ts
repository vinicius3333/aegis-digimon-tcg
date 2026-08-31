import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST14-09.js";
// BT19-071 is the neutral production producer for the deck-mill trigger below.
import "../../cards/BT19/BT19-071.js";

describe("ST14-09 BeelStarmon", () => {
  it("reduces its play cost by 4 per 10 cards in trash", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "ST14-09", as: "beelstar" }],
        trash: Array.from({ length: 10 }, () => "BT1-009"),
      },
    });
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("beelstar").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.memory).toBe(1);
  });

  it("reduces its play cost by 8 with 20 cards in trash", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "ST14-09", as: "beelstar" }],
        trash: Array.from({ length: 20 }, () => "BT1-009"),
      },
    });
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("beelstar").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.memory).toBe(5);
  });

  it("plays an Impmon from trash with Rush when its deck is trashed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST14-09", as: "beelstar" }],
          trash: [
            { card: "ST14-02", as: "impmon" },
            { card: "BT19-071", as: "miller" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.playInstances([s.inst("miller").instanceId]);
    await settle(() => s.state.players[0]!.deck.length === 0);
    const impmon = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === "ST14-02");
    expect(impmon).toBeDefined();
    expect(observe(s.engine).hasKeyword(impmon!, "Rush")).toBe(true);
  });

  it("trashes the top card of its deck when an opponent attacks", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST14-09", as: "beelstar" }],
        deck: ["BT1-009"],
        security: ["BT1-001", "BT1-001"],
      },
      1: { battleArea: [{ card: "BT1-010", as: "attacker" }], security: ["BT1-011"] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 1);
    expect(s.state.players[0]!.trash[0]!.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });
});
