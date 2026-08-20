import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-010.js";

describe("EX8-010", () => {
  it("deletes an opposing Digimon with 4000 DP or less on play and deletion", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "Delete", target: { count: 1, filter: { dp: { op: "lte", value: 4000 } } } });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({ kind: "Delete", target: { count: 1, filter: { dp: { op: "lte", value: 4000 } } } });
  });
  it("inherits +2000 DP during your turn", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: 2000, duration: "permanent" }));
});
