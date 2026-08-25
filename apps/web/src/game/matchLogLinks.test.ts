import { describe, expect, it } from "vitest";
import { logSegments } from "./matchLogLinks";

describe("logSegments", () => {
  it("leaves a line with no cards in one piece", () => {
    expect(logSegments("Turn 3 begins.", new Map())).toEqual([{ text: "Turn 3 begins." }]);
  });

  it("links a card name inside the sentence", () => {
    expect(logSegments("You played Agumon.", new Map([["Agumon", "ST1-03"]]))).toEqual([
      { text: "You played " },
      { text: "Agumon", cardId: "ST1-03" },
      { text: "." },
    ]);
  });

  it("links every occurrence of the same name", () => {
    const segments = logSegments("Agumon met Agumon", new Map([["Agumon", "ST1-03"]]));
    expect(segments.filter((segment) => segment.cardId).length).toBe(2);
  });

  it("prefers the longer name when one contains the other", () => {
    const cards = new Map([
      ["Greymon", "a"],
      ["MetalGreymon", "b"],
    ]);
    const segments = logSegments("MetalGreymon digivolved", cards);
    expect(segments[0]).toEqual({ text: "MetalGreymon", cardId: "b" });
  });

  it("never claims a character for two cards", () => {
    const segments = logSegments(
      "MetalGreymon",
      new Map([
        ["Greymon", "a"],
        ["MetalGreymon", "b"],
      ]),
    );
    expect(segments.map((segment) => segment.text).join("")).toBe("MetalGreymon");
  });

  it("keeps the whole line's text intact", () => {
    const text = "You played Agumon and then Greymon attacked.";
    const cards = new Map([
      ["Agumon", "a"],
      ["Greymon", "g"],
    ]);
    expect(
      logSegments(text, cards)
        .map((segment) => segment.text)
        .join(""),
    ).toBe(text);
  });
});
