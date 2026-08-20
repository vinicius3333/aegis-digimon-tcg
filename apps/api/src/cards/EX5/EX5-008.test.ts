import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-008.js";

describe("EX5-008 Firamon", () => {
  it("reveals three and adds one Light Fang and one Night Claw/Galaxy card", () => {
    const effects = compiled.effects?.filter((entry) => entry.trigger === "OnPlay" || entry.trigger === "WhenDigivolving");
    expect(effects).toHaveLength(2);
    expect(effects?.[0]?.actions?.[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom", add: [{ filter: { nameOrTrait: [{ match: "trait", tokens: ["Light Fang"] }] } }, { filter: { nameOrTrait: [{ match: "trait", tokens: ["Night Claw", "Galaxy"] }] } }] });
  });
});
