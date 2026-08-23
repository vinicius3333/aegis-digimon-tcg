import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-124.js";

describe("P-124 Davis Motomiya", () => {
  it("plays Veemon from hand through the first On Play mode", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "P-124", as: "davis" },
            { card: "BT11-023", as: "veemon" },
          ],
        },
      },
      { autoChooseOption: true, preferOptionIndex: 0, autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("davis").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("veemon").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("veemon").instanceId)).toBe(
      true,
    );
    assertNoLoudGap(s);
  });
});
