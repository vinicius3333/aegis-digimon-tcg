import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-050.js";

describe("EX7-050", () => {
  it("reduces the cost of its Dark Dragon or Evil Dragon digivolution by 1", () =>
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldDigivolve",
      actions: [{ mode: "reduceCost", amount: 1 }],
    }));
  it("inherits a permanent +2000 DP effect during your turn", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 2000,
      duration: "permanent",
    }));
});
