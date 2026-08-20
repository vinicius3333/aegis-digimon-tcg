import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-016.js";

describe("EX4-016 Greymon", () => {
  it("reveals three and adds Kiriha plus a blue or black card", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, add: [{ count: 1, to: "hand", filter: { nameOrTrait: [{ match: "name", tokens: ["Kiriha Aonuma"] }] } }, { count: 1, to: "hand", filter: { colors: ["Blue", "Black"] } }], rest: "trash" });
  });
  it("has Save and inherited attack draw", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.keywords).toMatchObject([{ keyword: "Save" }]);
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({ isInherited: true, actions: [{ kind: "Draw", amount: 1 }] });
  });
});
