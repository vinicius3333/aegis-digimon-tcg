import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX11-026.js";

describe("EX11-026 Pteromon", () => {
  it("suspends an own Digimon and grants an eligible ally +3000 DP", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-012", as: "ally", dp: 2000 }], hand: [{ card: "EX11-026", as: "pteromon" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 3;
    const ally = s.perm("ally");
    const initialDP = ally.currentDP;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pteromon").instanceId })).toEqual({ ok: true });
    await settle(() => ally.currentDP === initialDP + 3000, 600);
    expect(ally.isSuspended).toBe(true);
    expect(ally.currentDP).toBe(initialDP + 3000);
  });

  it("encodes both entry timings, any-player suspension, exact trait groups, and inherited battle memory", () => {
    const compiled = runtimeCompiledCard("EX11-026")!;
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, cost: 0, isAlternate: true }]);
    for (const trigger of ["WhenMoving", "OnPlay"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "Suspend", target: { filter: { controllerDefault: "any" } }, optional: true },
          { kind: "ModifyDP", amount: 3000, condition: { kind: "ifThisEffectActed" }, target: { filter: { nameOrTrait: [{ tokens: ["Avian", "Bird"], match: "trait" }, { tokens: ["Vortex Warriors"], match: "trait" }] } } },
        ],
      });
    }
    expect(compiled.effects).toContainEqual(expect.objectContaining({ trigger: "YourTurn", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenBattleWon", sourceFilter: { isSelfRef: true }, actions: [{ kind: "GainMemory", amount: 1 }] }] }));
  });
});
