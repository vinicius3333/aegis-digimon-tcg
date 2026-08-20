import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-014.js";

describe("EX8-014", () => {
  it("has Fortitude and may suspend a Digimon to delete an opposing Digimon with 8000 DP or less", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited && entry.trigger === "Static")?.keywords).toContainEqual({ keyword: "Fortitude", raw: "＜Fortitude＞" });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([{ kind: "Suspend", optional: true }, { kind: "SubTrigger", event: "whenSuspended", actions: [{ kind: "Delete", condition: { kind: "selfIsSuspended" }, target: { count: 1, filter: { dp: { op: "lte", value: 8000 } } } }] }]);
  });
  it("inherits Security Attack +1", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" }));
});
