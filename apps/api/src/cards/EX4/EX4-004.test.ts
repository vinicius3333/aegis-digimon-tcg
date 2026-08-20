import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-004.js";

describe("EX4-004 Pinamon", () => {
  it("gains 1 memory when deleted outside of battle", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions?.[0]).toMatchObject({ kind: "GainMemory", amount: 1, condition: { kind: "not", condition: { kind: "triggerRemovalCause", removalCause: "byBattle" } } });
  });
});
