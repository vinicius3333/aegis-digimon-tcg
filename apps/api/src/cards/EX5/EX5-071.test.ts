import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-071.js";

describe("EX5-071 Four Great Deva", () => {
  it("waives color requirements with a Deva/Four Sovereigns Digimon and reveals three for a trait card", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions[0]?.kind).toBe("WaiveColorRequirement");
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, add: [{ count: 1, to: "placeUnder", orDispositions: [{ to: "hand" }] }], rest: "deckTopOrBottom" });
  });
  it("activates Main from security", () => expect(compiled.effects?.find((entry) => entry.isSecurity)?.actions[0]?.kind).toBe("ActivateMain"));
});
