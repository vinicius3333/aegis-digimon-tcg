import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";
describe("ST21-05", () => {
  it("matches the Adventure Tamer play clause", () => {
    expect(getCardDefinition("ST21-05")?.effectText).toContain("1 or fewer Tamers");
    const a = runtimeCompiledCard("ST21-05")?.effects.find((x) => x.trigger === "WhenDigivolving")?.actions[0];
    expect(a).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      condition: { kind: "permanentCount" },
    });
  });
  it("gives exactly one opposing Digimon minus 2000 DP once per turn", () => {
    const e = runtimeCompiledCard("ST21-05")?.effects.find((x) => x.trigger === "WhenAttacking");
    expect(e).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "ModifyDP", amount: -2000, duration: "forTheTurn", target: { count: 1 } }],
    });
  });
});
