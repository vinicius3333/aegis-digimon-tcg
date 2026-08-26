import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-072.js";

describe("BT15-072", () => {
  it("has Blocker and an unlimited all-turns leave-prevention replacement", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Blocker" }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          leaveCause: "otherThanYourEffect",
          sourceFilter: { controller: "mine", excludeSelf: true },
          cost: { kind: "delete" },
        },
      ],
    });
    expect(compiled.effects?.[1]?.frequency).toBeUndefined();
  });
});
