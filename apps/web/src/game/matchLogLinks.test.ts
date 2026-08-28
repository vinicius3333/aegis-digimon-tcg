import { describe, expect, it } from "vitest";
import { logSegments } from "./matchLogLinks";

describe("logSegments", () => {
  it("leaves a line with no cards in one piece", () => {
    expect(logSegments("Turn 3 begins.", [])).toEqual([{ text: "Turn 3 begins." }]);
  });

  it("links a card name inside the sentence", () => {
    expect(logSegments("You played Agumon.", [{ name: "Agumon", cardId: "ST1-03" }])).toEqual([
      { text: "You played " },
      { text: "Agumon", cardId: "ST1-03" },
      { text: "." },
    ]);
  });

  it("links every occurrence of the same card", () => {
    const segments = logSegments("Agumon met Agumon", [{ name: "Agumon", cardId: "ST1-03" }]);
    expect(segments.filter((segment) => segment.cardId).length).toBe(2);
  });

  it("gives two cards sharing a name their own link, in the order the line names them", () => {
    const segments = logSegments("You revealed Agumon with Agumon", [
      { name: "Agumon", cardId: "ST1-03" },
      { name: "Agumon", cardId: "BT1-010" },
    ]);

    expect(segments.filter((segment) => segment.cardId).map((segment) => segment.cardId)).toEqual([
      "ST1-03",
      "BT1-010",
    ]);
  });

  it("prefers the longer name when one contains the other", () => {
    const cards = [
      { name: "Greymon", cardId: "a" },
      { name: "MetalGreymon", cardId: "b" },
    ];
    const segments = logSegments("MetalGreymon digivolved", cards);
    expect(segments[0]).toEqual({ text: "MetalGreymon", cardId: "b" });
  });

  it("never claims a character for two cards", () => {
    const segments = logSegments("MetalGreymon", [
      { name: "Greymon", cardId: "a" },
      { name: "MetalGreymon", cardId: "b" },
    ]);
    expect(segments.map((segment) => segment.text).join("")).toBe("MetalGreymon");
  });

  it("keeps the whole line's text intact", () => {
    const text = "You played Agumon and then Greymon attacked.";
    const cards = [
      { name: "Agumon", cardId: "a" },
      { name: "Greymon", cardId: "g" },
    ];
    expect(
      logSegments(text, cards)
        .map((segment) => segment.text)
        .join(""),
    ).toBe(text);
  });
});
