import { describe, expect, it } from "vitest";
import { hasBlockedWord, maskBlockedWords } from "./blockedWords.js";

describe("maskBlockedWords", () => {
  it("masks English, Portuguese and l33t spellings and keeps the rest", () => {
    expect(maskBlockedWords("what the fuck")).toBe("what the ****");
    expect(maskBlockedWords("que porra é essa")).not.toContain("porra");
    expect(maskBlockedWords("que porra é essa")).toMatch(/^que \*+ é essa$/);
    expect(maskBlockedWords("sh1t")).not.toContain("sh1t");
  });

  it("finds words written with accents and masks them in the original text", () => {
    const masked = maskBlockedWords("seu cuzão");
    expect(masked.startsWith("seu ")).toBe(true);
    expect(masked).not.toContain("cuzão");
    expect(masked).toHaveLength("seu cuzão".length);
  });

  it("leaves card names and ordinary game talk untouched", () => {
    for (const text of ["Vulcanusmon attacks", "Good luck, have fun!", "Boa sorte, bom jogo", "Picante Red", "Cuco"])
      expect(maskBlockedWords(text)).toBe(text);
  });
});

describe("hasBlockedWord", () => {
  it("agrees with the masking", () => {
    expect(hasBlockedWord("Caralho Rush")).toBe(true);
    expect(hasBlockedWord("Jesmon Blitz")).toBe(false);
  });
});
