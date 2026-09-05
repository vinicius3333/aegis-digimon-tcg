import { CardColor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { viableColorCandidates } from "./colorMatching.js";

const { Red, Blue, Yellow } = CardColor;

describe("mandatory distinct-color choices", () => {
  it("reserves a two-color candidate when the single-color candidate needs the current color", () => {
    expect(
      viableColorCandidates(
        [Red, Blue],
        [
          { id: "dual", colors: [Red, Blue] },
          { id: "red", colors: [Red] },
        ],
      ).map((candidate) => candidate.id),
    ).toEqual(["red"]);
  });

  it("keeps both legal choices when either preserves the maximum", () => {
    expect(
      viableColorCandidates(
        [Red, Blue],
        [
          { id: "dual", colors: [Red, Blue] },
          { id: "red", colors: [Red] },
          { id: "blue", colors: [Blue] },
        ],
      ).map((candidate) => candidate.id),
    ).toEqual(["dual", "red"]);
  });

  it("reserves colors across multicolor targets even without a single-color preference", () => {
    expect(
      viableColorCandidates(
        [Red, Blue, Yellow],
        [
          { id: "redBlue", colors: [Red, Blue] },
          { id: "redYellow", colors: [Red, Yellow] },
          { id: "yellow", colors: [Yellow] },
        ],
      ).map((candidate) => candidate.id),
    ).toEqual(["redYellow"]);
  });

  it("selects a lone multicolor target only once", () => {
    const dual = { id: "dual", colors: [Red, Blue] };
    expect(viableColorCandidates([Red, Blue], [dual])).toEqual([dual]);
    expect(viableColorCandidates([Blue], [])).toEqual([]);
  });

  it("skips an absent color without losing later choices", () => {
    const blue = { id: "blue", colors: [Blue] };
    expect(viableColorCandidates([Red, Blue], [blue])).toEqual([]);
    expect(viableColorCandidates([Blue], [blue])).toEqual([blue]);
  });
});
