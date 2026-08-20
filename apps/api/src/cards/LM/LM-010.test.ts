import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./LM-010.js";

describe("LM-010", () => {
  it("suspends one Tamer, locks all opponent Tamers, and scales DP per suspended Tamer", () => {
    const compiled = runtimeCompiledCard("LM-010")!;
    const onPlay = compiled.effects.find((entry) => entry.trigger === "OnPlay")!;
    expect(onPlay.actions).toContainEqual(expect.objectContaining({ kind: "Suspend", target: expect.objectContaining({ count: 1, filter: expect.objectContaining({ kind: ["Tamer"] }) }) }));
    expect(onPlay.actions).toContainEqual(expect.objectContaining({ kind: "Restrict", restriction: "unsuspend", duration: "untilOpponentTurnEnd", target: expect.objectContaining({ count: "all" }) }));
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")!.actions).toContainEqual(expect.objectContaining({ kind: "ModifyDP", amount: 1000, scaling: expect.objectContaining({ unit: "cards", filter: expect.objectContaining({ suspended: true }) }) }));
  });
});
