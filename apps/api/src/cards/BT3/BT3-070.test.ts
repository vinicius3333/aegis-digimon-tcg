import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT3-070.js";

describe("BT3-070 Etemon", () => {
  it("has Blocker and plays a revealed level 6 Etemon on deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-070", as: "etemon" }],
          deck: [
            { card: "BT3-074", as: "metalEtemon" },
            "BT1-010",
            "BT1-011",
            "BT1-012",
            "BT1-013",
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const playedId = s.inst("metalEtemon").instanceId;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("etemon"), "Blocker")).toBe(true);

    await advance(s.engine).verb.deletePermanent([s.perm("etemon").permanentId]);

    expect(
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === playedId),
    ).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(4);
  });
});
