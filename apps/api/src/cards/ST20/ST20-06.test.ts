import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST20-06.js";

describe("ST20-06 Angewomon", () => {
  it("may free-digivolve one other Digimon into an Adventure card from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST20-07", as: "other" }],
          hand: [
            { card: "ST20-06", as: "angewomon" },
            { card: "ST20-09", as: "next" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("angewomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("other").topCard?.instanceId === s.inst("next").instanceId);
  });
});
