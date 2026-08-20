import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-056.js";

describe("EX7-056", () => {
  it("has Blocker and on deletion trashes a card to delete opposing level 3 and level 4 Digimon", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords).toContainEqual({ keyword: "Blocker", raw: "＜Blocker＞" });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions).toMatchObject([{ kind: "Trash" }, { kind: "Delete", target: { filter: { levels: [3] } } }, { kind: "Delete", target: { filter: { levels: [4] } } }]);
  });
  it("inherits Retaliation", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "Retaliation", raw: "＜Retaliation＞" }));
});
