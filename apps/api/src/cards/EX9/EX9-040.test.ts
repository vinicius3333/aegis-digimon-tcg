import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-040.js";

describe("EX9-040", () => {
  it("has Blocker and once per turn suspends an opposing Digimon when suspended", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords).toContainEqual({ keyword: "Blocker", raw: "＜Blocker＞" });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns" && !entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenSuspended", actions: [{ kind: "Suspend", target: { filter: { controller: "opponent" } } }] }] });
  });
  it("inherits +1000 DP", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }] }));
});
