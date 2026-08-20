import { describe, expect, it } from "vitest";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "./EX12-013.js";

describe("EX12-013 BetelGammamon", () => {
  it("models play-or-use as one choice", () => {
    const action = registeredCompiledCards.get("EX12-013")!.effects.find((e) => e.trigger === "Main")!.actions[0]!;
    expect(action).toMatchObject({ kind: "Modal", choose: 1, options: [[{ kind: "PlayWithoutCost" }], [{ kind: "UseOptionWithoutCost" }]] });
  });
});
