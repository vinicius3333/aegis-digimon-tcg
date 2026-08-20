import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-015.js";

describe("EX8-015", () => {
  it("gains DP, blocks return, and conditionally deletes up to 10000 DP when digivolving", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([{ kind: "Restrict", restriction: "beReturned", duration: "untilOpponentTurnEnd" }, { kind: "ModifyDP", amount: 3000, duration: "untilOpponentTurnEnd" }, { kind: "Delete", target: { count: 1, filter: { dp: { op: "lte", value: 10000 } } }, condition: { kind: "selfDigivolutionStackHasTrait" } }]));
  it("inherits Security Attack +1", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" }));
});
