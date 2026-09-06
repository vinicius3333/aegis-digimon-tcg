import { describe, it, expect } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { matchNameOrTrait } from "./interpreter.js";

// `nameExact` models documented behavior `CardNames.Contains("X")` — literal card-name equality,
// not substring. BT4-086 "[Cerberusmon]" must NOT match "Cerberusmon: Werewolf
// Mode" (KB Q1231/Q1232), whereas the default `name` (substring) mode would.
describe("matchNameOrTrait nameExact mode", () => {
  const cerberusmon = { nameEn: "Cerberusmon" };
  const werewolfMode = { nameEn: "Cerberusmon: Werewolf Mode" };
  const ref = (match: "name" | "nameExact") => ({
    tokens: ["Cerberusmon"],
    match,
  });

  it("matches the literally-named card", () => {
    expect(matchNameOrTrait(cerberusmon, ref("nameExact"))).toBe(true);
  });

  it("rejects a longer name containing the token", () => {
    expect(matchNameOrTrait(werewolfMode, ref("nameExact"))).toBe(false);
  });

  it("substring `name` mode still matches the variant (unchanged)", () => {
    expect(matchNameOrTrait(werewolfMode, ref("name"))).toBe(true);
  });

  it("ignores display punctuation without weakening exact-name boundaries", () => {
    const blastMode = { nameEn: "Beelzemon: Blast Mode" };
    const punctuationFree = { tokens: ["Beelzemon Blast Mode"], match: "nameExact" as const };

    expect(matchNameOrTrait(blastMode, punctuationFree)).toBe(true);
    expect(matchNameOrTrait(werewolfMode, ref("nameExact"))).toBe(false);
  });
});

// CR 2-3-1-2; P-139 Q4246; EX5-070 Q3679: a bracketed card name
// accepts its Rule alias, but not a Digimon merely carrying that trait.
describe("named X Antibody source references", () => {
  it.each([
    ["BT9-109", true],
    ["EX5-070", true],
    ["BT15-021", false],
    ["BT20-053", false],
  ] as const)("matches %s by exact printed or Rule name: %s", (cardId, expected) => {
    const definition = getCardDefinition(cardId)!;
    expect(matchNameOrTrait(definition, { tokens: ["X Antibody"], match: "nameExact" })).toBe(expected);
  });
});

it.each([
  ["BT10-016", "Jesmon"],
  ["BT10-086", "Omnimon"],
  ["BT20-024", "Seadramon"],
  ["BT20-026", "MegaSeadramon"],
  ["BT20-059", "Gankoomon"],
] as const)("does not treat the longer name %s as [%s]", (cardId, token) => {
  expect(matchNameOrTrait(getCardDefinition(cardId)!, { tokens: [token], match: "nameExact" })).toBe(false);
});
