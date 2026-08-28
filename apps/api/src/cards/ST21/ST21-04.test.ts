import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";
describe("ST21-04", () => {
  it("implements the errata's one-source removal boundary", () => {
    expect(getCardDefinition("ST21-04")?.effectText).toContain("1 or fewer digivolution cards");
    const action = runtimeCompiledCard("ST21-04")?.effects.find((x) => x.trigger === "OnPlay")?.actions[0];
    expect(action).toMatchObject({
      kind: "TrashDigivolution",
      target: { count: 1 },
      amount: 1,
      scaling: { per: 2, unit: "colors" },
    });
  });
  it("makes Alliance mandatory while keeping the subsequent attack optional", () => {
    const actions = runtimeCompiledCard("ST21-04")?.effects.find((x) => x.trigger === "YourTurn")?.actions ?? [];
    expect(actions.some((a) => a.kind === "SubTrigger")).toBe(true);
    expect(actions.at(-1)).toMatchObject({ kind: "Attack", optional: true });
  });
});
