import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX4-026.js";

describe("EX4-026 Youkomon", () => {
  it("grants Blocker on play and digivolution and is also treated as Kyubimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions?.[0]).toMatchObject({ kind: "GrantStatic", grant: "name", tokens: ["Kyubimon"] });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0]).toMatchObject({ kind: "GrantStatic", grant: "keyword", keyword: { keyword: "Blocker" }, duration: "untilOpponentTurnEnd" });
  });

  it("reduces an opposing Digimon by 2000 when using an Option costing at least two", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({ isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenOptionUsed", fireCondition: { kind: "triggerOptionCostAtLeast", value: 2 }, actions: [{ kind: "ModifyDP", amount: -2000 }] }] });
  });

  it("applies the On Play Blocker grant to a selected own Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX4-026", as: "source" }, { card: "BT1-009", as: "target" }] },
    }, { autoSelectCards: true });

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));

    expect(["source", "target"].some((name) => observe(s.engine).hasKeyword(s.perm(name), "Blocker"))).toBe(true);
  });
});
