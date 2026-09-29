import { allCardIds } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { tamerAsDigimonLevel } from "./tamerOntoDigivolve.js";

describe("tamerAsDigimonLevel", () => {
  it("finds exactly the printed 'as if the Tamer is a level N Digimon' routes", () => {
    const routes = Object.fromEntries(
      allCardIds()
        .map((cardId) => [cardId, tamerAsDigimonLevel(cardId)] as const)
        .filter(([, level]) => level !== undefined)
        .sort(([left], [right]) => left.localeCompare(right)),
    );

    expect(routes).toEqual({
      "BT12-012": 3,
      "BT12-013": 3,
      "BT12-015": 4,
      "BT12-024": 3,
      "BT12-025": 3,
      "BT12-065": 3,
      "BT12-066": 3,
      "BT17-011": 3,
      "BT17-012": 3,
      "BT17-014": 4,
      "BT17-022": 3,
      "BT17-023": 3,
      "BT17-026": 4,
      "BT4-011": 3,
      "BT4-013": 3,
      "BT4-025": 3,
      "BT4-027": 3,
      "BT6-049": 3,
      "BT6-050": 3,
      "BT7-011": 3,
      "BT7-021": 3,
      "BT7-022": 3,
      "BT7-023": 3,
      "BT7-035": 3,
      "BT7-036": 3,
      "BT7-046": 3,
      "BT7-047": 3,
      "BT7-060": 3,
      "BT7-061": 3,
      "BT7-071": 3,
      "BT7-073": 3,
      "BT7-112": 6,
    });
  });

  it("leaves plain [Digivolve] [Tamer name] requirements digivolving the Tamer as a Tamer (Q2957)", () => {
    expect(tamerAsDigimonLevel("BT18-037")).toBeUndefined();
  });
});
