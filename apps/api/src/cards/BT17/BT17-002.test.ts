import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT17-002.js";

describe("BT17-002 Xiaomon", () => {
  it("Q2702: draws only once when two Digimon are played simultaneously from digivolution cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT6-030",
            under: [{ card: "BT1-010", as: "firstPlayed" }, { card: "BT1-011", as: "secondPlayed" }, "BT17-002"],
            as: "host",
          },
        ],
        deck: ["BT1-012", "BT1-013"],
      },
    });
    await s.ready();

    await advance(s.engine).verb.playInstances([s.inst("firstPlayed").instanceId, s.inst("secondPlayed").instanceId]);
    await settle(() => s.state.players[0]!.hand.length === 1);

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(3);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT17-002"]);
  });

  it("does not draw when a Digimon is played from the hand", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT6-030", under: ["BT17-002"], as: "host" }],
        hand: [{ card: "BT1-010", as: "played" }],
        deck: ["BT1-011"],
      },
    });
    await s.ready();

    await advance(s.engine).verb.playInstances([s.inst("played").instanceId]);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("does not draw on the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT6-030",
            under: [{ card: "BT1-010", as: "played" }, "BT17-002"],
            as: "host",
          },
        ],
        deck: ["BT1-011"],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).verb.playInstances([s.inst("played").instanceId]);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });
});
