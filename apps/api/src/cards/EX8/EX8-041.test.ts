import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-041.js";

describe("EX8-041", () => {
  it("suspends an opposing Tamer and prevents it from unsuspending on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([{ kind: "Suspend", target: { count: 1 } }, { kind: "Restrict", restriction: "unsuspend", duration: "untilOpponentTurnEnd" }]);
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toHaveLength(2);
  });
  it("inherits Retaliation", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "Retaliation", raw: "＜Retaliation＞" }));
});
