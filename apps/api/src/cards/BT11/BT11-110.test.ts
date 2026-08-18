import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT11-110.js";

describe("BT11-110 Evil Squall", () => {
  it("deletes up to 3 unsuspended level 5-or-lower Digimon and ignores invalid targets", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["AD1-023"],
          hand: [{ card: "BT11-110", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "eligible-a" },
            { card: "BT1-015", as: "eligible-b" },
            { card: "BT1-081", as: "level-six" },
            { card: "BT1-020", as: "suspended", suspended: true },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 2);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual(
      expect.arrayContaining(["BT1-081", "BT1-020"]),
    );
  });
});
