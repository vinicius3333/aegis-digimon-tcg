import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-048.js";

describe("EX9-048", () => {
  it("draws two by trashing a Negamon-text card from hand", () => {
    const action = compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0];
    expect(action).toMatchObject({ kind: "Draw", amount: 2, cost: { kind: "trash" } });
    expect(action?.cost?.target?.filter).toMatchObject({ zone: "hand", nameOrTrait: [{ tokens: ["Negamon"], match: "text" }] });
  });
  it("inherits +1000 DP", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }] }));
});
