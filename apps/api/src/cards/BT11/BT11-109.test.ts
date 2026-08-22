import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT11-109.js";

describe("BT11-109 Astral Snatcher", () => {
  it("places Bagra Army trash cards under an own host, then relocates an opposing Digimon under another", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-082", as: "host" }],
          trash: [{ card: "BT11-077", as: "material" }],
          hand: [{ card: "BT11-109", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "moved" },
            { card: "BT1-015", as: "destination" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.perm("host").stack.some(({ instanceId }) => instanceId === s.inst("material").instanceId) &&
        s.state.players[1]!.battleArea.length === 2,
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
  });
});
