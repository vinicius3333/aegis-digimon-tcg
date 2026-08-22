import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-054.js";

describe("EX4-054 Wendigomon", () => {
  it("adds a suspended Digimon's DP and Security Attack plus one for the attack", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({ isInherited: true, actions: [{ kind: "AddDPFromSuspendedCost", dpSource: { kind: "suspendedTarget" }, alsoGainKeywords: [{ keyword: "SecurityAttack", amount: 1 }] }] });
  });
  it("returns a green Digimon from trash once per turn when another own Digimon is suspended", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfAttack")).toMatchObject({ isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "Return", to: "hand", target: { filter: { zone: "trash", colors: ["Green"] } }, condition: { kind: "youHave", filter: { excludeSelf: true, suspended: true } } }] });
  });

  it("returns a green Digimon from trash after an attack when another is suspended", async () => {
    const s = setupEngine({
      0: { trash: [{ card: "EX4-033", as: "recovered" }], battleArea: [{ card: "BT1-009", as: "host", under: ["EX4-054"] }, { card: "BT1-010", as: "other", suspended: true }] },
    }, { autoSelectCards: true });
    await s.engine.recomputeContinuousEffects();

    await advance(s.engine).fire(EffectTiming.OnEndAttack, s.perm("host"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("recovered").instanceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("recovered").instanceId)).toBe(true);
  });
});
