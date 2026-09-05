import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-007.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("EX9-007", () => {
  it("reveals 3 for a DM card and a Ver.1 card, placing the latter under a DM Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        { count: 1, to: "hand" },
        { count: 1, to: "placeUnder" },
      ],
      rest: "deckBottom",
    }));
  it("inherits +2000 DP during your turn", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 2000,
      duration: "permanent",
    }));

  it("adds a DM card and places a Ver.1 card face-down under a DM Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX9-007", as: "source" }],
          battleArea: [{ card: "EX9-050", as: "target" }],
          deck: ["BT22-049", "EX9-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.deck.length === 1 &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.stack.some((card) => card.cardId === "EX9-009")),
    );

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT22-049")).toBe(true);
    expect(s.perm("target").stack.some((card) => card.cardId === "EX9-009" && card.faceUp === false)).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010"]);
  });

  it("applies inherited +2000 DP to the evolved host during its controller's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX9-007", as: "base" }],
        hand: [{ card: "BT1-015", as: "stage4" }],
        deck: ["BT1-009"],
      },
    });
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("stage4").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("base").topCard.cardId).toBe("BT1-015");
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["EX9-007"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.memory).toBe(8);
    expect(s.perm("base").currentDP).toBe(6000);
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("base").currentDP).toBe(4000);
  });
});
