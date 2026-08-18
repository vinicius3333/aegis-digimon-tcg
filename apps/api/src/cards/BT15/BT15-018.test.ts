import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import "./BT15-018.js";

describe("BT15-018 memory gates", () => {
  it("compiles each printed memory condition against the correct side", () => {
    const compiled = getCompiledCard("BT15-018");
    expect(compiled).toBeDefined();

    const conditions = compiled!.effects.map((effect) => effect.actions[0]!.condition);
    expect(conditions).toEqual([
      { kind: "memoryAtLeast", value: 4, controller: "opponent" },
      { kind: "memoryAtMost", value: 4, controller: "mine" },
    ]);
  });
});
