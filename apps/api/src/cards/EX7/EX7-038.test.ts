import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-038.js";

describe("EX7-038", () => {
  it("has Blocker", () =>
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords).toContainEqual({
      keyword: "Blocker",
      raw: "＜Blocker＞",
    }));
  it("inherits Reboot", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Reboot",
      raw: "＜Reboot＞",
    }));
  it("requires a level 2 NSp Digimon for the alternate evolution", () =>
    expect(compiled.digivolutionRequirement).toContainEqual(
      expect.objectContaining({ level: 2, traits: ["NSp"], cost: 0, isAlternate: true }),
    ));
});
