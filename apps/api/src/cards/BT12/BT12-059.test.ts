import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-059.js";

describe("BT12-059 Agumon", () => {
  it("adds a Greymon Digimon and Tai Kamiya Tamer from the reveal", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT12-059", as: "agumon" }],
          deck: ["BT1-015", "BT1-085", "BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("agumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2);

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId).sort()).toEqual(["BT1-015", "BT1-085"]);
  });

  it("gives a Greymon host +1000 DP", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-015", as: "host", under: ["BT12-059"] }] },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });
});
