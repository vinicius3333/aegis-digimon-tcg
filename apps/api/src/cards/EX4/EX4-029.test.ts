import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-029.js";

describe("EX4-029 Antylamon", () => {
  it("adds the suspended Digimon's DP and Security Attack plus one for the attack", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({ isInherited: true, actions: [{ kind: "AddDPFromSuspendedCost", dpSource: { kind: "suspendedTarget" }, duration: "forThisAttack", alsoGainKeywords: [{ keyword: "SecurityAttack", amount: 1 }] }] });
  });
  it("places the top deck card into security at three or fewer security", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfAttack")?.actions?.[0]).toMatchObject({ kind: "SecurityManipulation", op: "placeFromDeck", toTop: true, condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 3 } });
  });

  it("restores security and reduces an opponent after an attack", async () => {
    const s = setupEngine({
      0: {
        deck: ["BT1-010"],
        security: ["BT1-010", "BT1-010", "BT1-010"],
        battleArea: [{ card: "BT1-009", as: "source", under: ["EX4-029"] }, { card: "BT1-009", as: "other", suspended: true }],
      },
      1: { battleArea: [{ card: "BT1-011", as: "target", dp: 8000 }] },
    }, { autoSelectCards: true, autoOrderTriggers: true });
    await s.engine.recomputeContinuousEffects();

    await advance(s.engine).fire(EffectTiming.OnEndAttack, s.perm("source"));

    expect(s.state.players[0]!.security).toHaveLength(4);
    expect(s.perm("target").currentDP).toBe(6000);
  });
});
