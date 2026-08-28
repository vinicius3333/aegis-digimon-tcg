import { describe, it, expect } from "vitest";
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
