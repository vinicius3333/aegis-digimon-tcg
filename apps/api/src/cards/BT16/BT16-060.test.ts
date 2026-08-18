import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

function cardIr() {
  const source = readFileSync(fileURLToPath(new URL("./BT16-060.ts", import.meta.url)), "utf8");
  const match = source.match(/const compiled: CompiledCard = ([\s\S]*?);\n\nregisterIrCard/);
  if (match === null || match[1] === undefined) throw new Error("BT16-060 compiled IR not found");
  return JSON.parse(match[1]) as {
    effects: { actions: { kind: string; scaling?: { unit?: string; filter?: { zone?: string } } }[] }[];
  };
}

describe("BT16-060 Tankdramon IR", () => {
  it("scales each play-cost reduction from matching revealed cards", () => {
    const compiled = cardIr();

    const reductions = compiled!.effects
      .flatMap((effect) => effect.actions)
      .filter((action) => action.kind === "Replacement");

    expect(reductions).toHaveLength(2);
    for (const reduction of reductions) {
      expect(reduction.scaling?.unit).toBe("cards");
      expect(reduction.scaling?.filter?.zone).toBe("revealed");
    }
  });
});
