import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-012.js";

describe("BT14-012", () => {
  it("gains +2000 DP and memory when attacking with Tai Kamiya", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({ actions: [{ kind: "ModifyDP", amount: 2000 }, { kind: "GainMemory", amount: 1, condition: { kind: "youHave" } }] }));
  it("inherits conditional +2000 DP for Greymon or Omnimon", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ actions: [{ kind: "Aura", effect: { kind: "modifyDP", amount: 2000 }, while: { kind: "selfHasNameContaining" } }] }));
});
