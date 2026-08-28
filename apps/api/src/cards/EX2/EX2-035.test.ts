import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-035.js";

describe("EX2-035 Cyberdramon", () => {
  it("plays Ryo Akiyama from hand for free when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-031", as: "base" }],
          hand: [
            { card: "EX2-035", as: "evolution" },
            { card: "EX2-062", as: "ryo" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("ryo").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("ryo").instanceId),
    ).toBe(true);
  });
});
