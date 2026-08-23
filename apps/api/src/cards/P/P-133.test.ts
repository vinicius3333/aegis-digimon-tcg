import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-133.js";

describe("P-133 Shoto Kazama", () => {
  it("plays Pteromon from hand on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "P-133", as: "shoto" },
            { card: "P-131", as: "pteromon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shoto").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("pteromon").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("pteromon").instanceId)).toBe(
      true,
    );
    assertNoLoudGap(s);
  });
});
