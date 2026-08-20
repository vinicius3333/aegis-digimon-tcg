import { describe, expect, it } from "vitest";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "./EX12-027.js";

describe("EX12-027 TeslaJellymon", () => {
  it("offers exactly one play-or-use branch", () => {
    const effect = registeredCompiledCards.get("EX12-027")!.effects[0]!;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions).toHaveLength(1);
    expect(effect.actions[0]).toMatchObject({ kind: "Modal", choose: 1, options: [[{ kind: "PlayWithoutCost" }], [{ kind: "UseOptionWithoutCost" }]] });
  });
});
