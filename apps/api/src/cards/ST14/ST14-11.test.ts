import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST14-11.js";

describe("ST14-11 Ai & Mako", () => {
  it("suspends, returns a hand card to the deck, and gains memory after a purple digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST14-11", as: "tamer" },
            { card: "ST14-03", as: "purple" },
          ],
          hand: [
            { card: "ST14-05", as: "evolver" },
            { card: "BT1-009", as: "cost-card" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("purple").permanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 0);
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.memory).toBe(9);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("cost-card").instanceId);
  });

  it("still suspends and gains memory with an empty hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST14-11", as: "tamer" },
            { card: "ST14-03", as: "purple" },
          ],
          hand: [{ card: "ST14-05", as: "evolver" }],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("purple").permanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.memory).toBe(9);
  });

  it("reveals four on play and adds one Evil Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST14-11", as: "tamer" }],
          deck: ["ST14-02", "BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "orderCards"));
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.deck.length === 3);
    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "ST14-02")).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });

  it("plays itself from security without paying the cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "ST14-11", as: "security-tamer" }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security-tamer"));
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "ST14-11"));
    expect(s.state.memory).toBe(0);
  });
});

describe("ST14-11 Ai & Mako — KB Q&A rulings", () => {
  // The digivolve rule draws 1 card before the trigger resolves, so an empty deck is what keeps the hand at 0.
  const digivolveIntoPurple = async (deck: string[], accept: boolean) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST14-11", as: "tamer" },
            { card: "ST14-03", as: "purple" },
          ],
          hand: [{ card: "ST14-05", as: "evolver" }],
          deck,
        },
      },
      accept ? { autoAcceptOptional: true, autoSelectCards: true } : { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("purple").permanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    return s;
  };

  it("gains 1 memory with 0 cards in hand because returning a card is not a by-cost (Q803)", async () => {
    const emptyHand = await digivolveIntoPurple([], true);
    expect(emptyHand.state.players[0]!.hand).toHaveLength(0);
    expect(emptyHand.state.players[0]!.deck).toHaveLength(0);
    expect(emptyHand.perm("tamer").isSuspended).toBe(true);
    expect(emptyHand.state.memory).toBe(9);

    const declined = await digivolveIntoPurple([], false);
    expect(declined.perm("tamer").isSuspended).toBe(false);
    expect(declined.state.memory).toBe(8);

    const withDrawnCard = await digivolveIntoPurple(["BT1-009"], true);
    expect(withDrawnCard.state.players[0]!.hand).toHaveLength(0);
    expect(withDrawnCard.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(withDrawnCard.state.memory).toBe(9);
  });
});
