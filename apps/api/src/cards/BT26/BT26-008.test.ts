import { EffectTiming, digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT26-008.js";
import "../index.js";

describe("BT26-008 Kotemon", () => {
  it("compiles On Play, When Moving, and inherited DP effects", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.effects.map((e) => [e.trigger, e.isInherited])).toEqual([["OnPlay", undefined], ["OnMove", undefined], ["YourTurn", true]]);
    for (const effect of compiled.effects.slice(0, 2)) {
      expect(effect.actions).toMatchObject([
        { kind: "SelectBind", target: { bindAs: "kotemonBonusTarget" } },
        { kind: "GainKeyword", target: { fromSelectionRef: "kotemonBonusTarget" } },
        { kind: "ModifyDP", target: { fromSelectionRef: "kotemonBonusTarget" } },
      ]);
    }
  });

  it("uses the exact zero-cost Shambala/TS evolution requirement", () => {
    expect(digivolutionRequirementsFor("BT26-008")).toContainEqual({ level: 2, traits: ["Shambala", "TS"], cost: 0, isAlternate: true });
  });

  it("grants Piercing and +3000 DP to one controller-owned Shambala/TS Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT26-012", as: "target" }, { card: "BT1-009", as: "other" }], hand: [{ card: "BT26-008", as: "self" }] } }, { autoSelectCards: true });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("self").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 9000);
    expect(observe(s.engine).hasPierce(s.perm("target"))).toBe(true);
  });

  it("keeps Piercing and +3000 DP on the same chosen Digimon when multiple targets qualify", async () => {
    const preferred: string[] = [];
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT26-012", as: "chosen" },
          { card: "BT26-013", as: "other" },
        ],
        hand: [{ card: "BT26-008", as: "self" }],
      },
    }, { autoSelectCards: true, preferInstanceIds: preferred });
    preferred.push(s.inst("chosen").instanceId);
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("self").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("chosen").currentDP === 9000);

    expect(observe(s.engine).hasPierce(s.perm("chosen"))).toBe(true);
    expect(s.perm("other").currentDP).toBe(3000);
    expect(observe(s.engine).hasPierce(s.perm("other"))).toBe(false);
  });
});
