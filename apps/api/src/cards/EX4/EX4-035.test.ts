import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./EX4-035.js";

describe("EX4-035 BlackGargomon", () => {
  it("adds a suspended Digimon's DP and Security Attack plus one", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({ isInherited: true, actions: [{ kind: "AddDPFromSuspendedCost", dpSource: { kind: "suspendedTarget" }, alsoGainKeywords: [{ keyword: "SecurityAttack", amount: 1 }] }] });
  });
  it("gains 2000 DP when an effect suspends it", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({ isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenEffectSuspends", actions: [{ kind: "ModifyDP", amount: 2000, duration: "untilOpponentTurnEnd" }] }] });
  });

  it("gains 2000 DP when an effect suspends another Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX4-035"] }, { card: "BT1-010", as: "other" }] },
    });
    const before = s.perm("host").currentDP;
    s.state.turnSeat = 0;
    await s.ready();
    await s.engine.recomputeContinuousEffects();
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("host"));

    await advance(s.engine).fireSubTrigger("whenEffectSuspends", {
      subjectPermanentId: s.perm("other").permanentId,
      suspendedPermanentId: s.perm("other").permanentId,
      effectSuspendSeat: 0,
    });
    await settle(() => s.perm("host").currentDP === before + 2000);

    expect(s.perm("host").currentDP).toBe(before + 2000);
  });
});
