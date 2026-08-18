import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../ST5/ST5-15.js";
import "./BT10-005.js";

describe("BT10-005 Monimon", () => {
  it("gives its Twilight host +1000 DP", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT10-066", as: "host", under: ["BT10-005"] }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });

  it("removes the inherited bonus when De-Digivolve exposes a non-Twilight top", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["ST5-03"],
          hand: [{ card: "ST5-15", as: "laserEye" }],
        },
        1: {
          battleArea: [{
            card: "BT10-066",
            as: "host",
            under: ["BT10-005", "BT10-020"],
          }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("laserEye").instanceId,
    })).toEqual({ ok: true });
    await settle(() =>
      s.perm("host").topCard.cardId === "BT10-020" &&
      s.perm("host").currentDP === s.perm("host").baseDP
    );

    expect(s.perm("host").topCard.cardId).toBe("BT10-020");
    expect(s.perm("host").stack.some(({ cardId }) => cardId === "BT10-005")).toBe(true);
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });
});
