import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-073.js";

describe("BT14-073", () => {
  it("gains one memory when trashed from hand during your turn", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenTrashedFromHand", actions: [{ kind: "GainMemory", amount: 1 }] }] });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenTrashedFromHand" }] });
  });
});
