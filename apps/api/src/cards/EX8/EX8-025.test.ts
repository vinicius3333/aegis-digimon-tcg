import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-025.js";

describe("EX8-025", () => {
  it("places a DS Digimon from trash underneath itself on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "PlaceUnder", optional: true, target: { count: 1 } });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "PlaceUnder" });
  });
  it("plays a level 5 or lower DS Digimon from its digivolution cards at end of attack and inherits fixed attack targeting", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfAttack")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "PlayWithoutCost", from: ["digivolutionCards"], payCost: false, optional: true }] });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({ kind: "Restrict", restriction: "attackTargetChange", duration: "permanent" });
  });
});
