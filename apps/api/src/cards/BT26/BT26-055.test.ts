import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-055.js";

describe("BT26-055 Giromon", () => {
  it("shares the Once Per Turn body across play, digivolution, and Counter and inherits security trash", () => {
    expect(compiled.effects?.slice(1, 4).map((effect) => effect.sharedUseKey)).toEqual([
      "bt26-055-place-delete", "bt26-055-place-delete", "bt26-055-place-delete",
    ]);
    expect(compiled.effects?.[0]?.keywords).toContainEqual(expect.objectContaining({ keyword: "Fragment", amount: 2 }));
    expect(compiled.effects?.[4]).toMatchObject({ trigger: "AllTurns", isInherited: true, actions: [{ kind: "SubTrigger", event: "whenLeavesPlay", actions: [{ kind: "SecurityManipulation", op: "trashTop" }] }] });
  });
});
