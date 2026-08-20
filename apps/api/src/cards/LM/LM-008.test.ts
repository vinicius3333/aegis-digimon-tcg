import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./LM-008.js";

describe("LM-008 Angoramon", () => {
  it("gains memory only with a Tamer and grants the inherited Angoramon-text DP aura", () => {
    const compiled = runtimeCompiledCard("LM-008")!;
    expect(compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase")!.actions).toContainEqual(expect.objectContaining({ kind: "GainMemory", amount: 1, condition: expect.objectContaining({ kind: "youHave" }) }));
    expect(compiled.effects.find((entry) => entry.trigger === "YourTurn")!.actions).toContainEqual(expect.objectContaining({ kind: "Aura", effect: expect.objectContaining({ kind: "modifyDP", amount: 2000 }), while: expect.objectContaining({ kind: "selfTopHasText" }) }));
  });
});
