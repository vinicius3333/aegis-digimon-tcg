import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-030.js";

describe("EX6-030 Dominimon", () => {
  it("contains the security search/play and Angel protection clauses in typed IR", () => {
    const text = JSON.stringify(compiled);
    expect(compiled.coverage).toBe("full");
    expect(text).toContain("SearchSecurity");
    expect(text).toContain("PlayWithoutCost");
    expect(text).toContain("trashSecurityTop");
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([
      { kind: "SearchSecurity", then: { optional: true } },
      { kind: "ModifyDP", amount: -7000, duration: "untilEachTurnEnd" },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Replacement",
      affectsAll: true,
      leaveCause: "otherThanBattle",
    });
  });

  it("publicly reduces an opposing Digimon by 7000 on digivolving", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX6-030", as: "dom" }], security: ["EX6-019"] }, 1: { battleArea: [{ card: "EX6-031", as: "opponent" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    const before = s.perm("opponent").currentDP;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("dom"));
    expect(s.perm("opponent").currentDP).toBe(before - 7000);
  });
});
