import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-046.js";

describe("EX8-046", () => {
  it("draws 2 on deletion by trashing a Mineral or Rock card from hand", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({ kind: "Draw", amount: 2, optional: true, abortOnDecline: true, cost: { kind: "trash", target: { count: 1 } } }));
  it("inherits Blocker", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "Blocker", raw: "＜Blocker＞" }));
});
