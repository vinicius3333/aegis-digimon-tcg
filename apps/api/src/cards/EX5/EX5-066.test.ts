import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-066.js";

describe("EX5-066 Kari", () => {
  it("deletes the opponent's lowest-DP Digimon and returns a Light Fang/Night Claw Digimon if you have a Tamer", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions).toMatchObject([{ kind: "Delete", target: { filter: { superlative: "lowestDP" } } }, { kind: "Return", to: "hand", condition: { kind: "youHave" }, target: { filter: { zone: "trash", nameOrTrait: [{ match: "trait", tokens: ["Light Fang", "Night Claw"] }] } } }]);
  });
  it("activates its Main effect from security", () => expect(compiled.effects?.find((entry) => entry.isSecurity)?.actions[0]?.kind).toBe("ActivateMain"));
});
