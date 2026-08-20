import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-004.js";

describe("EX5-004 Frimon", () => {
  it("draws once per turn when attacking if it has Leomon in its name", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({ isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "Draw", amount: 1, condition: { kind: "selfHasNameContaining", names: ["Leomon"] } }] });
  });
});
