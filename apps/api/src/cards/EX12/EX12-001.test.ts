import { describe, expect, it } from "vitest";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "./EX12-001.js";

describe("EX12-001 Nyaromon", () => {
  it("attacks only with the DNA result", () => {
    const effect = registeredCompiledCards.get("EX12-001")!.effects[0]!;
    expect(effect.actions[0]).toMatchObject({ kind: "DnaDigivolve", bindResultAs: "dnaResult", materials: { count: 2, filter: { includesSelf: true } } });
    expect(effect.actions[1]).toMatchObject({ kind: "Attack", target: { fromSelectionRef: "dnaResult" } });
  });
});
