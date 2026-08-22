import { describe, expect, it } from "vitest";
import { compiled } from "./BT18-085.js";

describe("BT18-085 Zanbamon", () => {
  it("scales digivolution reduction and Your Turn security attack/DP", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [{ kind: "Replacement", event: "wouldDigivolve" }],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "YourTurn",
      actions: [
        { kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: 1 } },
        { kind: "ModifyDP", amount: 2000 },
      ],
    });
  });
});
