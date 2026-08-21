import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX8-015.js";

describe("EX8-015", () => {
  it("gains DP, blocks return, and conditionally deletes up to 10000 DP when digivolving", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([
      { kind: "Restrict", restriction: "beReturned", duration: "untilOpponentTurnEnd" },
      { kind: "ModifyDP", amount: 3000, duration: "untilOpponentTurnEnd" },
      {
        kind: "Delete",
        target: { count: 1, filter: { dp: { op: "lte", value: 10000 } } },
        condition: { kind: "selfDigivolutionStackHasTrait" },
      },
    ]));
  it("inherits Security Attack +1", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "SecurityAttack",
      amount: 1,
      raw: "＜Security Attack +1＞",
    }));
  it("exposes inherited Security Attack +1 on a live host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: [{ card: "EX8-015", as: "warGrowlmon" }] }] },
    });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });
});
