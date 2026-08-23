import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";
describe("ST21-08", () => {
  it("requires three total Adventure Tamer colors for free warp", () => {
    expect(getCardDefinition("ST21-08")?.effectText).toContain("3 or more total colors");
    const a = runtimeCompiledCard("ST21-08")?.effects.find((x) => x.trigger === "OnPlay")?.actions[0];
    expect(a).toMatchObject({
      kind: "Digivolve",
      payCost: false,
      optional: true,
      condition: { kind: "zoneColorCount", op: "gte", value: 3 },
    });
  });
  it("keeps the inherited permanent DP increase", () =>
    expect(runtimeCompiledCard("ST21-08")?.effects.find((x) => x.isInherited)).toMatchObject({
      trigger: "AllTurns",
      actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }],
    }));
});
