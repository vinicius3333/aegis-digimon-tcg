import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";
describe("ST21-06", () => {
  it("matches the 6000 DP security placement clause", () => {
    expect(getCardDefinition("ST21-06")?.effectText).toContain("6000 DP or lower");
    const a = runtimeCompiledCard("ST21-06")?.effects.find(x => x.trigger === "OnPlay")?.actions.find(action => action.kind === "SecurityManipulation");
    expect(a).toMatchObject({ kind: "SecurityManipulation", toTop: true });
  });
  it("retains both play and digivolve Adventure triggers", () => {
    const e = runtimeCompiledCard("ST21-06")?.effects ?? [];
    expect(e.some(x => x.trigger === "OnPlay")).toBe(true);
    expect(e.some(x => x.trigger === "WhenDigivolving")).toBe(true);
  });
});
