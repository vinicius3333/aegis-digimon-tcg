import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { definitionMatches } from "./interpreter.js";

describe("definition keyword matching", () => {
  it("distinguishes declaring Digi-Burst from referring to another Digimon's Digi-Burst", () => {
    const declaresDigiBurst = getCardDefinition("BT4-054")!;
    const onlyRefersToDigiBurst = getCardDefinition("BT4-052")!;

    expect(definitionMatches({ keywords: ["DigiBurst"] }, declaresDigiBurst)).toBe(true);
    expect(definitionMatches({ keywords: ["DigiBurst"] }, onlyRefersToDigiBurst)).toBe(false);
  });
});
