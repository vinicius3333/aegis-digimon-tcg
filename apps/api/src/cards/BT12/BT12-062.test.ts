import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-062.js";

describe("BT12-062 Greymon", () => {
  it("plays Tai Kamiya from hand when digivolving while no Tai is in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-058", as: "base" }],
          hand: [
            { card: "BT12-062", as: "evo" },
            { card: "BT1-085", as: "tai" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT1-085"));
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT1-085")).toBe(true);
  });

  it("gives a Greymon host +1000 DP", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-015", as: "host", under: ["BT12-062"] }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });
});
