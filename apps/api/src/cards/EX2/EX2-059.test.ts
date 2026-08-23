import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-059.js";

describe("EX2-059 Shu-Chong Wong", () => {
  it("may play Lopmon from hand for free on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX2-059", as: "shu" },
            { card: "EX2-020", as: "lopmon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shu").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("lopmon").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("lopmon").instanceId),
    ).toBe(true);
  });
});
