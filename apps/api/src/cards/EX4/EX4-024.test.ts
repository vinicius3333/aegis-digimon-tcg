import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./EX4-024.js";

describe("EX4-024 Renamon", () => {
  it("prevents two opposing Digimon at 4000 DP or less from attacking", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({ kind: "Restrict", restriction: "attack", duration: "untilOpponentTurnEnd", target: { filter: { controller: "opponent", dp: { op: "lte", value: 4000 } }, count: 2 } });
  });
  it("gains memory once per turn when using an Option costing at least two", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({ isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenOptionUsed", fireCondition: { kind: "triggerOptionCostAtLeast", value: 2 }, actions: [{ kind: "GainMemory", amount: 1 }] }] });
  });

  it("restricts only two opposing Digimon at or below 4000 DP", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX4-024", as: "source" }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "lowOne", dp: 4000 },
          { card: "BT1-010", as: "lowTwo", dp: 3000 },
          { card: "BT1-011", as: "lowThree", dp: 2000 },
          { card: "BT1-012", as: "high", dp: 5000 },
        ],
      },
    }, { autoSelectCards: true, autoOrderTriggers: true });

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));

    const continuous = s.engine as unknown as { continuous: { hasRestriction(id: string, restriction: string): boolean } };
    const restricted = ["lowOne", "lowTwo", "lowThree"].filter((name) => continuous.continuous.hasRestriction(s.perm(name).permanentId, "attack"));
    expect(restricted).toHaveLength(2);
    expect(continuous.continuous.hasRestriction(s.perm("high").permanentId, "attack")).toBe(false);
  });
});
