import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-006.js";
import "./BT8-072.js";
import "./BT8-079.js";

describe("BT8-006 DemiMeramon", () => {
  it("draws once when an effect trashes cards from the deck", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-076", as: "base", under: ["BT8-006", "BT8-072"] }],
        hand: [{ card: "BT8-079", as: "evolving" }],
        deck: ["BT8-033", "BT8-034", "BT8-035", { card: "BT8-036", as: "drawn" }],
      },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 200);

    expect(s.state.players[0]!.trash).toHaveLength(2);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });

  it("does not draw when a revealed card is trashed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT8-076", as: "host", under: ["BT8-006", "BT8-072"] }],
          hand: [{ card: "BT8-072", as: "demidevimon" }],
          deck: [
            { card: "BT8-092", as: "tamer" },
            { card: "BT8-072", as: "trashedPurple" },
            "BT8-034",
            { card: "BT8-035", as: "wouldDraw" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("demidevimon").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tamer").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("wouldDraw").instanceId)).toBe(false);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("wouldDraw").instanceId)).toBe(true);
  });
});

describe("BT8-006 DemiMeramon — KB Q&A rulings", () => {
  it("draws 1 when your own effect trashes a card from your deck (Q1696)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-076", as: "base", under: ["BT8-006", "BT8-072"] }],
        hand: [{ card: "BT8-079", as: "evolving" }],
        deck: [
          { card: "BT8-033", as: "digivolveDraw" },
          { card: "BT8-034", as: "trashedOne" },
          { card: "BT8-035", as: "trashedTwo" },
          { card: "BT8-036", as: "drawn" },
          { card: "BT8-037", as: "stillInDeck" },
        ],
      },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    const trashIds = s.state.players[0]!.trash.map((card) => card.instanceId);
    expect(trashIds).toEqual(
      expect.arrayContaining([s.inst("trashedOne").instanceId, s.inst("trashedTwo").instanceId]),
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("digivolveDraw").instanceId,
      s.inst("drawn").instanceId,
    ]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("stillInDeck").instanceId]);
  });

  it("does not draw when a card revealed from the top of the deck is trashed (Q1697)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT8-076", as: "host", under: ["BT8-006", "BT8-072"] }],
          hand: [{ card: "BT8-072", as: "demidevimon" }],
          deck: [
            { card: "BT8-092", as: "tamer" },
            { card: "BT8-072", as: "trashedPurple" },
            "BT8-034",
            { card: "BT8-035", as: "wouldDraw" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("demidevimon").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    const player = s.state.players[0]!;
    expect(player.trash.some((card) => card.instanceId === s.inst("trashedPurple").instanceId)).toBe(true);
    expect(player.hand.map((card) => card.instanceId)).toEqual([s.inst("tamer").instanceId]);
    expect(player.deck.some((card) => card.instanceId === s.inst("wouldDraw").instanceId)).toBe(true);
  });
});
