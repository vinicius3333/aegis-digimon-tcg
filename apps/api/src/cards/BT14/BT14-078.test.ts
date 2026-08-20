import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-078.js";

describe("BT14-078", () => {
  it("deletes itself, draws two, and may return a Loogamon at end of your turn", () => expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")).toMatchObject({ actions: [{ kind: "Delete" }, { kind: "Draw", amount: 2 }, { kind: "Return", to: "hand", optional: true, target: { filter: { nameOrTrait: [{ tokens: ["Loogamon"], match: "name" }] } } }] }));
  it("scales the deletion level ceiling with the number of cards trashed", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")).toMatchObject({ actions: [{ kind: "Trash", optional: true, trackCount: "trashedThisEffect", target: { count: 3 } }, { kind: "Delete", scaling: { unit: "namedCount", countSource: "trashedThisEffect", levelCeilingAdd: 1 }, target: { filter: { levelComparison: { op: "lte", value: 3 } } } }] }));
});
