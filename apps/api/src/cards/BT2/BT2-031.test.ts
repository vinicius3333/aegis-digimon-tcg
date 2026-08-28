import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT2-031.js";

describe("BT2-031 Vikemon", () => {
  it("gets +1000 DP and Security Attack +1 on its turn while the opponent has a source-less Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-031", as: "vikemon", under: ["BT2-027"] }] },
      1: { battleArea: [{ card: "BT1-010", as: "sourceLess" }] },
    });

    await s.engine.recomputeContinuousEffects();

    expect(s.perm("vikemon").currentDP).toBe(s.perm("vikemon").baseDP + 1000);
    expect(observe(s.engine).keywordAmount(s.perm("vikemon"), "SecurityAttack")).toBe(1);
  });

  it("does not gain either bonus when every opposing Digimon has a digivolution card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-031", as: "vikemon", under: ["BT2-027"] }] },
      1: { battleArea: [{ card: "BT1-010", under: ["BT1-001"] }] },
    });

    await s.engine.recomputeContinuousEffects();

    expect(s.perm("vikemon").currentDP).toBe(s.perm("vikemon").baseDP);
    expect(observe(s.engine).keywordAmount(s.perm("vikemon"), "SecurityAttack")).toBe(0);
  });

  it("does not count the controller's own source-less Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-031", as: "vikemon", under: ["BT2-027"] }, { card: "BT1-010" }] },
    });

    await s.engine.recomputeContinuousEffects();

    expect(s.perm("vikemon").currentDP).toBe(s.perm("vikemon").baseDP);
    expect(observe(s.engine).keywordAmount(s.perm("vikemon"), "SecurityAttack")).toBe(0);
  });

  it("does not gain either bonus during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-031", as: "vikemon", under: ["BT2-027"] }] },
      1: { battleArea: [{ card: "BT1-010" }] },
    });
    s.state.turnSeat = 1;

    await s.engine.recomputeContinuousEffects();

    expect(s.perm("vikemon").currentDP).toBe(s.perm("vikemon").baseDP);
    expect(observe(s.engine).keywordAmount(s.perm("vikemon"), "SecurityAttack")).toBe(0);
  });

  it("does not count a source-less Digimon in the opponent's breeding area", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-031", as: "vikemon", under: ["BT2-027"] }] },
      1: { breeding: "BT1-010" },
    });

    await s.engine.recomputeContinuousEffects();

    expect(s.perm("vikemon").currentDP).toBe(s.perm("vikemon").baseDP);
    expect(observe(s.engine).keywordAmount(s.perm("vikemon"), "SecurityAttack")).toBe(0);
  });
});
