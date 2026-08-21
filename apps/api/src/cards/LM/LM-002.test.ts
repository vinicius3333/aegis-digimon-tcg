import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./LM-002.js";

describe("LM-002", () => {
  it("draws only at the start of your main phase with seven or fewer hand cards", () => {
    const compiled = runtimeCompiledCard("LM-002")!;
    expect(compiled.effects).toHaveLength(1);
    expect(compiled.effects[0]).toMatchObject({ trigger: "StartOfYourMainPhase" });
    expect(compiled.effects[0]!.actions).toContainEqual(
      expect.objectContaining({
        kind: "Draw",
        amount: 1,
        condition: expect.objectContaining({ kind: "zoneCount", zone: "hand", op: "lte", value: 7 }),
      }),
    );
  });
});
