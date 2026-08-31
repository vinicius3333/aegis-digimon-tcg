import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-146.js";

describe("P-146 Recharge Plug-In Q", () => {
  it("waives its color requirement with a Tamer and places itself under a non-white Digimon", () => {
    const compiled = runtimeCompiledCard("P-146")!;
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [{ kind: "WaiveColorRequirement", condition: { kind: "youHave", filter: { kind: ["Tamer"] } } }],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "Main",
      actions: [{ kind: "PlaceUnder", underFilter: { kind: ["Digimon"], excludeColors: ["White"] } }],
    });
  });

  it("limits both inherited and Security replacement effects to battle deletion", () => {
    const compiled = runtimeCompiledCard("P-146")!;
    const replacements = compiled.effects.filter((effect) =>
      effect.actions.some((action) => action.kind === "Replacement"),
    );
    expect(replacements).toHaveLength(2);
    for (const effect of replacements) {
      expect(effect.actions[0]).toMatchObject({ kind: "Replacement", event: "wouldBeDeleted", leaveCause: "byBattle" });
    }
    expect(compiled.effects[1]).toMatchObject({
      trigger: "Security",
      actions: [{ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: -1 }, duration: "forTheTurn" }],
    });
  });

  it("gives an opposing Digimon Security Attack -1 from its Security effect", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "P-146", as: "plug" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("plug"));
    await settle();
    expect(observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack")).toBe(-1);
  });

  it("uses the Tamer waiver to place this yellow Option under a non-white Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-146", as: "plug" }],
          battleArea: [
            { card: "BT1-085", as: "tamer" },
            { card: "BT1-009", as: "host" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("plug").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("host").stack.some((card) => card.instanceId === s.inst("plug").instanceId));
    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("plug").instanceId)).toBe(true);
  });
});
