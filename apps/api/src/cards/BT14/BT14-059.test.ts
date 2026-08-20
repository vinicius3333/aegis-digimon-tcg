import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-059.js";

describe("BT14-059", () => {
  it("has Retaliation and Save on deletion", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.keywords).toEqual(expect.arrayContaining([{ keyword: "Retaliation", raw: "＜Retaliation＞" }, { keyword: "Save", raw: "＜Save＞" }])));
  it("inherits Blocker", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "Blocker", raw: "＜Blocker＞" }));
});
