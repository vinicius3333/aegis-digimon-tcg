import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";
describe("ST21-07", () => {
  it("requires trashing one Adventure card before drawing two", () => {
    expect(getCardDefinition("ST21-07")?.effectText).toContain("By trashing 1 card");
    const a = runtimeCompiledCard("ST21-07")?.effects.find(x => x.trigger === "OnPlay")?.actions[0];
    expect(a).toMatchObject({ kind: "Draw", amount: 2, optional: true, abortOnDecline: true, cost: { kind: "trash", target: { count: 1 } } });
  });
  it("gives the host permanent inherited DP", () => {
    const e = runtimeCompiledCard("ST21-07")?.effects.find(x => x.isInherited);
    expect(e).toMatchObject({ trigger: "AllTurns", actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent", target: { isSelf: true } }] });
  });
});
