import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-021.js";

describe("EX8-021", () => {
  it("gains 1 memory once per turn when attacking and inherits Jamming", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "GainMemory", amount: 1 }] });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "Jamming", raw: "＜Jamming＞" });
  });
});
