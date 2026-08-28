import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-023.js";

describe("EX2-023 Taomon", () => {
  it("plays Rika Nonaka from hand without paying her cost when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-021", as: "base" }],
          hand: [
            { card: "EX2-023", as: "evolution" },
            { card: "EX2-060", as: "rika" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true },
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
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("rika").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("rika").instanceId),
    ).toBe(true);
  });
});
