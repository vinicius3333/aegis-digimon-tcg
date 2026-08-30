import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-053.js";
import "./BT2-060.js";

describe("BT2-053 Keramon", () => {
  it("Q1023 draws when another Digimon with the evolved host's name is played", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-060", as: "host", under: ["BT2-005", "BT2-053", "BT2-056"] }],
        hand: [{ card: "BT2-060", as: "sameName" }],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
    });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sameName").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });

  it("Q1023 does not compare the played name to Keramon when the host has another name", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-060", as: "host", under: ["BT2-005", "BT2-053", "BT2-056"] }],
        hand: [{ card: "BT2-053", as: "keramon" }],
        deck: [{ card: "BT1-010", as: "topDeck" }],
      },
    });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("keramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("topDeck").instanceId);
  });

  it("Q2814 triggers only once when 2 same-named Digimon are played simultaneously", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-082", as: "diaboromon", under: ["BT2-005", "BT2-053", "BT2-056", "BT2-060"] }],
        deck: [
          { card: "BT1-010", as: "firstDraw" },
          { card: "BT1-011", as: "secondDraw" },
        ],
      },
    });

    await advance(s.engine).verb.playTwoTokensInOneWindow(0, "Diaboromon");

    expect(
      s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId.includes("TOKEN")),
    ).toHaveLength(2);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.hand[0]!.instanceId).toBe(s.inst("firstDraw").instanceId);
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("secondDraw").instanceId);
  });

  it("does not trigger during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-060", as: "host", under: ["BT2-005", "BT2-053", "BT2-056"] }],
        hand: [{ card: "BT2-060", as: "sameName" }],
        deck: [{ card: "BT1-010", as: "topDeck" }],
      },
    });
    s.state.turnSeat = 1;
    await advance(s.engine).verb.playInstances([s.inst("sameName").instanceId]);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("topDeck").instanceId);
  });
});
