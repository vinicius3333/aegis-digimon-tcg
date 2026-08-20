import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../../cards/index.js";

describe("EX12-035 Gusokumon", () => {
  it("fires the inherited suspension effect for any Digimon's digivolution", () => {
    const compiled = registeredCompiledCards.get("EX12-035") ?? getCompiledCard("EX12-035");
    expect(compiled).toBeDefined();
    const serialized = JSON.stringify(compiled);
    expect(serialized).toContain('"event":"whenAnyDigivolves"');
    expect(serialized).not.toContain('"event":"whenOneOfYoursDigivolves"');
  });
});
