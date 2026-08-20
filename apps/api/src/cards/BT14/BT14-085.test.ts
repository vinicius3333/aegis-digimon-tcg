import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-085.js";

describe("BT14-085", () => {
  it("reveals three and adds a Vegetation, Plant, or Fairy Digimon", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom", add: [{ to: "hand", filter: { nameOrTrait: [{ tokens: ["Vegetation", "Plant", "Fairy"], match: "trait" }] } }] }));
  it("plays itself from security", () => expect(compiled.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({ isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false }] }));
});
