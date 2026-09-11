import { describe, expect, it } from "vitest";
import { getCardDefinition, textMatchesToken } from "@aegis/shared";
import { matchNameOrTrait } from "../effects/interpreter/matching/definition.js";
import "../../cards/index.js";

/**
 * Seam 12 `save-keyword-substring-overmatch`: a `texts: ["Save"]` requirement means the printed
 * ＜Save＞ keyword, not any card whose text happens to contain the letters. BT10-111 prints
 * ＜Material Save＞ and BT21-059 is named Savemon; neither has ＜Save＞.
 */
describe('printed keyword tokens in an "in its text" filter', () => {
  it("anchors a keyword token on its brackets", () => {
    expect(textMatchesToken("[on deletion] ＜save＞ (you may place...)", "Save")).toBe(true);
    expect(textMatchesToken("＜material save (2)＞", "Save")).toBe(false);
    expect(textMatchesToken("savemon gains 1000 dp", "Save")).toBe(false);
    // A non-keyword token keeps plain substring semantics.
    expect(textMatchesToken("[skullknightmon] gains ...", "Knightmon")).toBe(true);
  });

  it("rejects ＜Material Save＞ and [Savemon] as ＜Save＞ cards", () => {
    const ref = { tokens: ["Save"], match: "text" as const };
    const materialSave = getCardDefinition("BT10-111")!;
    const savemon = getCardDefinition("BT21-059")!;
    const realSave = getCardDefinition("EX10-026")!;

    expect(matchNameOrTrait(materialSave, ref)).toBe(false);
    expect(matchNameOrTrait(savemon, ref)).toBe(false);
    expect(matchNameOrTrait(realSave, ref)).toBe(true);
  });
});
