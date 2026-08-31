import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-002.js";

describe("BT7-002 Bukamon", () => {
  it("gains 1 memory when a Digimon is played from digivolution cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT4-026", under: ["BT7-002", { card: "BT6-019", as: "played" }], as: "host" }],
      },
    });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).verb.playInstances([s.inst("played").instanceId]);
    await settle(() => s.state.memory === 1);

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
  });

  it("does not trigger for an effect-driven Digimon play from hand", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT4-026", under: ["BT7-002", "BT6-019"], as: "host" }],
        hand: [{ card: "BT1-010", as: "played" }],
      },
    });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).verb.playInstances([s.inst("played").instanceId]);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
  });

  it("triggers only once per turn when multiple Digimon are played from digivolution cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT6-028",
            under: [
              "BT7-002",
              { card: "BT6-019", as: "firstPlayed" },
              { card: "BT4-026", as: "secondPlayed" },
              "BT6-025",
            ],
            as: "host",
          },
        ],
      },
    });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).verb.playInstances([s.inst("firstPlayed").instanceId]);
    await settle(() => s.state.memory === 1);
    await advance(s.engine).verb.playInstances([s.inst("secondPlayed").instanceId]);

    expect(s.state.memory).toBe(1);
  });

  it("does not trigger from a Digimon played from sources during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT4-026", under: ["BT7-002", { card: "BT6-019", as: "played" }], as: "host" }],
      },
    });
    s.state.memory = 0;
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).verb.playInstances([s.inst("played").instanceId]);

    expect(s.state.memory).toBe(0);
  });
});
