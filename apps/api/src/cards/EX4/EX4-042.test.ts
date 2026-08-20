import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-042.js";

describe("EX4-042 DarkMaildramon", () => {
  it("makes itself and all own Knightmon/Knightsmon unblockable for the turn", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions;
    expect(actions?.[0]).toMatchObject({ kind: "GrantStatic", target: { filter: { isSelfRef: true } }, grant: { keyword: "Unblockable" }, duration: "forTheTurn" });
    expect(actions?.[1]).toMatchObject({ kind: "GrantStatic", target: { count: "all", filter: { nameOrTrait: [{ match: "name", tokens: ["Knightmon", "Knightsmon"] }] } } });
  });
});
