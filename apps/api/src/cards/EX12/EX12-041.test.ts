import { describe, expect, it } from "vitest";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "./EX12-041.js";

describe("EX12-041 Thundermon", () => {
  it("does not play an Option when the text says play or use", () => {
    const options = (registeredCompiledCards.get("EX12-041")!.effects.find((e) => e.trigger === "Main")!.actions[0]! as any).options;
    expect(options[0][0].target.filter.kind).toEqual(["Digimon", "Tamer"]);
    expect(options[1][0]).toMatchObject({ kind: "UseOptionWithoutCost", filter: { kind: ["Option"] } });
  });
});
