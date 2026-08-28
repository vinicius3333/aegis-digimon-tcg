import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-067.js";

describe("EX5-067 Good Night Moon", () => {
  it("suspends one opposing Digimon or Tamer and optionally plays a Night Claw/Light Fang Tamer", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions).toMatchObject([
      {
        kind: "Restrict",
        restriction: "suspend",
        duration: "untilOpponentTurnEnd",
        target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } },
      },
      {
        kind: "Restrict",
        restriction: "suspend",
        duration: "untilOpponentTurnEnd",
        target: { count: 1, filter: { controller: "opponent", kind: ["Tamer"] } },
      },
      {
        kind: "PlayWithoutCost",
        from: ["hand"],
        payCost: false,
        optional: true,
        target: {
          count: 1,
          filter: {
            controller: "mine",
            kind: ["Tamer"],
            nameOrTrait: [{ match: "trait", tokens: ["Night Claw", "Light Fang"] }],
          },
        },
      },
    ]);
  });
  it("activates its Main effect from security", () =>
    expect(compiled.effects?.find((entry) => entry.isSecurity)?.actions[0]?.kind).toBe("ActivateMain"));
});
