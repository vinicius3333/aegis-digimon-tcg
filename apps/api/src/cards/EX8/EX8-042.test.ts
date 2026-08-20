import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-042.js";

describe("EX8-042", () => {
  it("has Fortitude and gains +3000 DP while suspended", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toContainEqual({ keyword: "Fortitude", raw: "＜Fortitude＞" });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns" && !entry.isInherited)?.actions[0]).toMatchObject({ kind: "Aura", effect: { kind: "modifyDP", amount: 3000 }, while: { kind: "selfIsSuspended" } });
  });
  it("inherits once-per-turn security trash after deleting in battle", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenDeletesInBattle", actions: [{ kind: "SecurityManipulation", op: "trashTop", amount: 1 }] }] }));
});
