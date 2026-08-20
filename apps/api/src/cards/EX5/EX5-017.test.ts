import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-017.js";

describe("EX5-017 Lekismon", () => {
  it("reveals three and adds Night Claw plus Light Fang/Galaxy cards on play and digivolving", () => {
    const effects = compiled.effects?.filter((entry) => entry.trigger === "OnPlay" || entry.trigger === "WhenDigivolving");
    expect(effects).toHaveLength(2);
    expect(effects?.[0]?.actions?.[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom", add: [{ filter: { nameOrTrait: [{ match: "trait", tokens: ["Night Claw"] }] } }, { filter: { nameOrTrait: [{ match: "trait", tokens: ["Light Fang", "Galaxy"] }] } }] });
  });
});
