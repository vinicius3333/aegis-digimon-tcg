import { describe, expect, it } from "vitest";
import { DNA_DIGIVOLUTION_REQUIREMENT_OVERRIDES, getCardDefinition } from "@aegis/shared";
import "../../cards/index.js";
import { definitionMatches } from "./interpreter.js";

describe("Discord 1556299408700735548: effect DNA destination filter", () => {
  it.each(Object.keys(DNA_DIGIVOLUTION_REQUIREMENT_OVERRIDES))(
    "accepts %s from the shared DNA requirements",
    (cardId) => {
      expect(definitionMatches({ hasDnaDigivolutionRequirement: true }, getCardDefinition(cardId)!)).toBe(true);
    },
  );
  it.each(["BT1-009", "BT22-026", "BT22-013"])("excludes %s without DNA requirements", (cardId) => {
    expect(definitionMatches({ hasDnaDigivolutionRequirement: true }, getCardDefinition(cardId)!)).toBe(false);
  });
});
