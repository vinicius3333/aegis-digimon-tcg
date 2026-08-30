import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-059.js";
import "./BT2-060.js";

describe("BT2-059 Kurisarimon", () => {
  it("Q1024 gains 1 memory when another Digimon with the evolved host's name is played", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-060", as: "host", under: ["BT2-054", "BT2-059"] }],
        hand: [{ card: "BT2-060", as: "sameName" }],
      },
    });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sameName").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 5);

    expect(s.state.memory).toBe(5);
  });

  it("Q1024 does not compare the played name to Kurisarimon when the host has another name", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-060", as: "host", under: ["BT2-054", "BT2-059"] }],
        hand: [{ card: "BT2-059", as: "kurisarimon" }],
      },
    });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kurisarimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    expect(s.state.memory).toBe(5);
  });

  it("Q2814 triggers only once when 2 same-named Digimon are played simultaneously", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-082", as: "diaboromon", under: ["BT2-054", "BT2-059", "BT2-060"] }],
      },
    });
    s.state.memory = 0;

    await advance(s.engine).verb.playTwoTokensInOneWindow(0, "Diaboromon");

    expect(
      s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId.includes("TOKEN")),
    ).toHaveLength(2);
    expect(s.state.memory).toBe(1);
  });

  it("does not trigger during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-060", as: "host", under: ["BT2-054", "BT2-059"] }],
        hand: [{ card: "BT2-060", as: "sameName" }],
      },
    });
    s.state.turnSeat = 1;
    s.state.memory = 0;

    await advance(s.engine).verb.playInstances([s.inst("sameName").instanceId]);

    expect(s.state.memory).toBe(0);
  });
});
