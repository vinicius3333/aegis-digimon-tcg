import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT4-073.js";

describe("BT4-073 BanchoGolemon", () => {
  it("has Blocker and gets +3000 DP on the opponent's turn while they have 3 Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-073", as: "bancho" }] },
      1: { battleArea: ["BT1-009", "BT1-010", "BT1-011"] },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    const bancho = s.perm("bancho");

    expect(observe(s.engine).hasKeyword(bancho, "Blocker")).toBe(true);
    expect(bancho.currentDP).toBe(bancho.baseDP + 3000);
  });

  it("does not get the DP bonus when the opponent has only 2 Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-073", as: "bancho" }] },
      1: { battleArea: ["BT1-009", "BT1-010"] },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("bancho").currentDP).toBe(s.perm("bancho").baseDP);
  });
});
