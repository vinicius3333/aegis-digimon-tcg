import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-016.js";

describe("EX2-016 Gorillamon", () => {
  it("plays a level-3 source from one of its blue Digimon on play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-014", as: "carrier", under: [{ card: "EX2-013", as: "source" }] }],
          hand: [{ card: "EX2-016", as: "gorillamon" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gorillamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 3);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("source").instanceId),
    ).toBe(true);
  });
});
