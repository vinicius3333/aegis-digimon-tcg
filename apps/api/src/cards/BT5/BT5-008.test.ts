import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT5-008.js";

describe("BT5-008 Gaossmon", () => {
  it("gives every other Gaossmon +3000 DP on its turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT5-008", as: "source", under: ["BT5-001"] },
          { card: "BT5-008", as: "other-a" },
          { card: "BT5-008", as: "other-b" },
          { card: "BT1-009", as: "unrelated" },
        ],
      },
      1: {
        battleArea: [{ card: "BT5-008", as: "opponent-gaossmon" }],
      },
    });
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("source").stack.map((card) => card.cardId)).toEqual(["BT5-001"]);
    expect(s.perm("source").currentDP).toBe(s.perm("source").baseDP + 6000);
    expect(s.perm("other-a").currentDP).toBe(s.perm("other-a").baseDP + 6000);
    expect(s.perm("other-b").currentDP).toBe(s.perm("other-b").baseDP + 6000);
    expect(s.perm("unrelated").currentDP).toBe(s.perm("unrelated").baseDP);
    expect(s.perm("opponent-gaossmon").currentDP).toBe(s.perm("opponent-gaossmon").baseDP);
  });

  it("gates the aura and cost block to the printed turn owners", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT5-008", as: "source" },
          { card: "BT5-008", as: "ally" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT5-008", as: "opponent" },
          { card: "BT5-008", as: "opponent-other" },
        ],
      },
    });

    await s.engine.recomputeContinuousEffects();
    expect(s.perm("ally").currentDP).toBe(s.perm("ally").baseDP + 3000);
    expect(s.perm("opponent").currentDP).toBe(s.perm("opponent").baseDP);
    expect((s.engine as any).continuous.blocksCostReduction(1, "digivolve")).toBe(false);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("ally").currentDP).toBe(s.perm("ally").baseDP);
    expect(s.perm("opponent").currentDP).toBe(s.perm("opponent").baseDP + 3000);
    expect(s.perm("opponent-other").currentDP).toBe(s.perm("opponent-other").baseDP + 3000);
    expect((s.engine as any).continuous.blocksCostReduction(1, "digivolve")).toBe(true);
    expect((s.engine as any).continuous.blocksCostReduction(0, "digivolve")).toBe(false);
  });

  it("prevents the opponent from reducing digivolution costs on their turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-008", as: "source" }] } });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect((s.engine as any).continuous.blocksCostReduction(1, "digivolve")).toBe(true);
    expect((s.engine as any).continuous.blocksCostReduction(0, "digivolve")).toBe(false);
  });
});
