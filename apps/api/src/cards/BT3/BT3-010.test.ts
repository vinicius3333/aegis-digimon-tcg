import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT3-001.js";
import "./BT3-010.js";

describe("BT3-010 ZubaEagermon", () => {
  it("gives Security Attack +1 to its level 7 host on its turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT6-018",
            as: "host",
            under: ["BT3-001", "BT3-009", "BT3-010", "BT3-013", "BT3-016"],
          },
        ],
      },
    });

    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });

  it("does not grant Security Attack +1 to a level 6 host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT3-016",
            as: "host",
            under: ["BT3-001", "BT3-009", "BT3-010", "BT3-013"],
          },
        ],
      },
    });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(0);
  });

  it("does not grant the inherited effect during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT6-018",
            as: "host",
            under: ["BT3-001", "BT3-009", "BT3-010", "BT3-013", "BT3-016"],
          },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(0);
  });
});
