import { describe, expect, it } from "vitest";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../BT1/BT1-089.js";
import "../BT13/BT13-007.js";
import "../BT13/BT13-040.js";
import "../BT14/BT14-045.js";
import "../BT14/BT14-046.js";
import "../BT2/BT2-112.js";
import "./ST13-08.js";
import "./ST13-16.js";

describe("ST13-08 Chikurimon", () => {
  it("prevents play-cost reductions for both players", async () => {
    const s = setupEngine({
      0: { battleArea: ["ST13-08"], hand: [{ card: "BT2-112", as: "blackWarGreymon" }] },
      1: { battleArea: [{ card: "BT1-084", dp: 10000 }] },
    });
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blackWarGreymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT2-112"));
    expect(s.state.memory).toBe(-9);
  });

  it("does not prevent an effect from playing a card without paying its cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["ST13-08", "BT1-009"],
          hand: [
            { card: "ST13-16", as: "option" },
            { card: "ST13-02", as: "zubamon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "ST13-02"));

    expect(s.state.memory).toBe(0);
  });
});

describe("ST13-08 Chikurimon — KB Q&A rulings", () => {
  async function memoryAfterPlaying(board: {
    playerHand: string;
    playerBattleArea: string[];
    playerBreeding?: string;
    opponentBattleArea: string[];
  }): Promise<{ memory: number; setup: EngineSetup }> {
    const s = setupEngine(
      {
        0: {
          battleArea: board.playerBattleArea.map((card, index) => ({ card, as: `mine${index}` })),
          ...(board.playerBreeding === undefined ? {} : { breeding: board.playerBreeding }),
          hand: [{ card: board.playerHand, as: "played" }],
        },
        1: { battleArea: board.opponentBattleArea.map((card) => ({ card, dp: 10000 })) },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    const playedId = s.inst("played").instanceId;
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === playedId));
    return { memory: s.state.memory, setup: s };
  }

  it("makes the opponent pay the full play cost despite a play-cost reduction effect (Q778)", async () => {
    const reduced = await memoryAfterPlaying({
      playerHand: "BT2-112",
      playerBattleArea: [],
      opponentBattleArea: ["BT1-084"],
    });
    expect(reduced.memory).toBe(10 - (13 - 6));

    const blocked = await memoryAfterPlaying({
      playerHand: "BT2-112",
      playerBattleArea: [],
      opponentBattleArea: ["BT1-084", "ST13-08"],
    });
    expect(blocked.memory).toBe(10 - 13);
  });

  it("still lets a play-without-paying-the-cost effect skip the play cost (Q779)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["ST13-08", "BT1-009"],
          hand: [
            { card: "ST13-16", as: "option" },
            { card: "ST13-02", as: "zubamon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "ST13-02"));

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "ST13-02")).toBe(false);
    expect(s.state.memory).toBe(0);
  });

  it("stops the opponent's King Drasil_7D6 breeding effect from reducing a Royal Knight play cost (Q780)", async () => {
    const reduced = await memoryAfterPlaying({
      playerHand: "BT13-040",
      playerBattleArea: [],
      playerBreeding: "BT13-007",
      opponentBattleArea: [],
    });
    expect(reduced.memory).toBe(10 - (7 - 4));

    const blocked = await memoryAfterPlaying({
      playerHand: "BT13-040",
      playerBattleArea: [],
      playerBreeding: "BT13-007",
      opponentBattleArea: ["ST13-08"],
    });
    expect(blocked.memory).toBe(10 - 7);
  });

  it("stops Togemon from reducing a green Tamer play cost and from suspending for it (Q781)", async () => {
    const reduced = await memoryAfterPlaying({
      playerHand: "BT1-089",
      playerBattleArea: ["BT14-046", "BT14-045"],
      opponentBattleArea: [],
    });
    expect(reduced.memory).toBe(10 - (4 - 3));
    expect(reduced.setup.state.players[0]!.battleArea.some((permanent) => permanent.isSuspended)).toBe(true);

    const blocked = await memoryAfterPlaying({
      playerHand: "BT1-089",
      playerBattleArea: ["BT14-046", "BT14-045"],
      opponentBattleArea: ["ST13-08"],
    });
    expect(blocked.memory).toBe(10 - 4);
    expect(blocked.setup.state.players[0]!.battleArea.some((permanent) => permanent.isSuspended)).toBe(false);
  });
});
