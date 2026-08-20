import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-008.js";

describe("EX8-008", () => {
  it("gains 1 memory on deletion", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({ kind: "GainMemory", amount: 1 }));
  it("inherits +2000 DP during your turn", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: 2000, duration: "permanent" }));
});
