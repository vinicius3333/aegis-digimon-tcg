import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-132.js";

describe("P-132 Galemon", () => {
  it("suspends one Digimon as cost and gains +2000 DP when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-064", as: "base" },
            { card: "BT1-065", as: "cost" },
          ],
          hand: [{ card: "P-132", as: "galemon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("galemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("galemon").instanceId);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("galemon").instanceId);
    assertNoLoudGap(s);
  });

  it("grants inherited Piercing while Shoto Kazama is present", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-064", dp: 3000, as: "host", under: ["P-132"] },
          { card: "P-133", as: "shoto" },
        ],
      },
    });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").topCard.cardId).toBe("BT1-064");
    assertNoLoudGap(s);
  });
});
