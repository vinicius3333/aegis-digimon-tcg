import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX4-030.js";

describe("EX4-030 Kuzuhamon", () => {
  it("registers full residual-free IR", () => {
    expect(getEffectModule("EX4-030")).toBeDefined();
    expect(runtimeCompiledCard("EX4-030")).toMatchObject({ coverage: "full", residual: [] });
  });

  it("uses one optional hand Option costing 5 or less when digivolving", () => {
    const effect = runtimeCompiledCard("EX4-030")?.effects?.find((entry) => entry.trigger === "WhenDigivolving");
    expect(effect?.actions?.[0]).toMatchObject({
      kind: "UseOptionWithoutCost",
      filter: { kind: ["Option"], playCostLte: 5 },
      payCost: false,
      from: ["hand"],
      optional: true,
    });
  });

  it("fires the once-per-turn cost-2 watcher and plays an eligible stack Digimon", () => {
    const effect = runtimeCompiledCard("EX4-030")?.effects?.find((entry) => entry.trigger === "YourTurn");
    expect(effect).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenOptionUsed" }],
    });
    expect(irNode(effect?.actions?.[0])?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["digivolutionCards"],
      payCost: false,
      optional: true,
    });
  });
});
