import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT11-085.js";

describe("BT11-085 WaruSeadramon", () => {
  it("plays a blue level 3 from an own blue Digimon's sources when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-079", as: "base", under: [{ card: "BT1-029", as: "source" }] }],
          hand: [{ card: "BT11-085", as: "waru" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("waru").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("source").instanceId),
    );
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).not.toContain(s.inst("source").instanceId);
  });
});
