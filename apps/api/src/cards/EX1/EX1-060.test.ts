import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-060.js";

describe("EX1-060 LadyDevimon", () => {
  it("may trash the top 3 cards of the deck when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-074", as: "base" }],
          hand: [{ card: "EX1-060", as: "evo" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 3);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("inherited gains 1 memory once per turn when a Digimon is played from trash", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-061", as: "host", under: ["EX1-060"] }],
        trash: [
          { card: "EX1-056", as: "first" },
          { card: "EX1-057", as: "second" },
        ],
      },
    });
    s.state.memory = 0;
    await advance(s.engine).verb.playInstances([s.inst("first").instanceId]);
    expect(s.state.memory).toBe(1);
    await advance(s.engine).verb.playInstances([s.inst("second").instanceId]);
    expect(s.state.memory).toBe(1);
  });
});
