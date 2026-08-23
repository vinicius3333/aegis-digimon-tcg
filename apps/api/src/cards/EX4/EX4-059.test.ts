import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX4-059.js";

describe("EX4-059 Cherubimon", () => {
  it("registers full residual-free IR with Alliance", () => {
    expect(getEffectModule("EX4-059")).toBeDefined();
    expect(runtimeCompiledCard("EX4-059")).toMatchObject({ coverage: "full", residual: [] });
    expect(
      runtimeCompiledCard("EX4-059")?.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions?.[0],
    ).toMatchObject({
      kind: "AddDPFromSuspendedCost",
      alsoGainKeywords: [{ keyword: "Piercing" }],
    });
  });

  it("grants optional On Deletion replay to itself and one eligible ally", () => {
    const effect = runtimeCompiledCard("EX4-059")?.effects?.find((entry) => entry.trigger === "WhenDigivolving");
    expect(effect?.actions).toHaveLength(2);
    expect(effect?.actions?.[0]).toMatchObject({
      kind: "GainTriggeredEffect",
      gainedTrigger: "onDeletionOf",
      duration: "untilOpponentTurnEnd",
    });
    expect(effect?.actions?.[1]).toMatchObject({
      kind: "GainTriggeredEffect",
      target: { filter: { excludeSelf: true, levelComparison: { op: "lte", value: 5 } } },
    });
    expect((effect?.actions?.[0] as any)?.gainedActions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      payCost: false,
      optional: true,
    });
  });
});
