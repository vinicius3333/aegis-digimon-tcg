import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT11-107.js";

describe("BT11-107 Hades Force", () => {
  it("registers the cataloged partial IR", () => {
    const compiled = runtimeCompiledCard("BT11-107")!;
    expect(compiled.coverage).toBe("partial");
    expect(compiled.residual).toHaveLength(1);
    expect(compiled.effects?.find((effect) => effect.trigger === "Security")).toMatchObject({ isSecurity: true });
  });
});
