import { getCardDefinition, type AssemblyMaterial } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { materialMatchesAssemblySlot } from "./assembly.js";
import "../../cards/index.js";

describe("Assembly printed-keyword material requirements", () => {
  const slot = (level: number): AssemblyMaterial => ({
    count: 1,
    level,
    colors: ["Black"],
    printedKeywords: ["Blocker"],
  });

  it("Q7412/Q7413: accepts main-text Blocker and rejects inherited-only Blocker", () => {
    expect(materialMatchesAssemblySlot(getCardDefinition("BT2-058")!, slot(4))).toBe(true);
    expect(materialMatchesAssemblySlot(getCardDefinition("EX13-050")!, slot(3))).toBe(false);
  });
});
