import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-002.js";

describe("BT7-002 Bukamon", () => {
  it("gains 1 memory when a Digimon is played from digivolution cards", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT6-030", under: [{ card: "BT1-010", as: "played" }, "BT7-002"], as: "host" }] } });
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
        battleArea: [{ card: "BT6-030", under: ["BT7-002"], as: "host" }],
        hand: [{ card: "BT1-010", as: "played" }],
      },
    });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).verb.playInstances([s.inst("played").instanceId]);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
  });
});
