import { describe, expect, it } from "vitest";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "./EX12-043.js";

describe("EX12-043 Hakubamon", () => {
  it("keeps the SW play and use branches mutually exclusive", () => {
    const action = registeredCompiledCards.get("EX12-043")!.effects.find((e) => e.trigger === "Main")!.actions[0]! as any;
    expect(action.kind).toBe("Modal");
    expect(action.choose).toBe(1);
    expect(action.options[1][0].filter.kind).toEqual(["Option"]);
  });
});
