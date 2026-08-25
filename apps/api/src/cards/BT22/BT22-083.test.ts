import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-083.js";

describe("BT22-083 Yuuko Kamishiro", () => {
  it("gains memory when an opponent Digimon exists at the start of your main phase", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: { kind: "opponentHas", filter: { kind: ["Digimon"] } },
    });
  });

  it("binds immunity and DP to the same paid target", () => {
    const block = (
      compiled.effects.find((entry) => !entry.isInherited && entry.trigger === "AllTurns")?.actions[0] as any
    ).actions[0];
    expect(block).toMatchObject({
      kind: "CostGatedBlock",
      cost: { kind: "suspend", target: { filter: { isSelfRef: true } } },
      optional: true,
      abortOnDecline: true,
    });
    expect(block.actions[0]).toMatchObject({ kind: "SelectBind", target: { bindAs: "yuukoProtectedDigimon" } });
    expect(block.actions[1]).toMatchObject({
      kind: "GrantImmunity",
      target: { fromSelectionRef: "yuukoProtectedDigimon" },
    });
    expect(block.actions[2]).toMatchObject({
      kind: "ModifyDP",
      target: { fromSelectionRef: "yuukoProtectedDigimon" },
      amount: 3000,
    });
    expect(block.actions[2].optional).toBeUndefined();
  });

  it("uses an executable Eater Eve name condition for the inherited attack-target-change DP", () => {
    const inherited = compiled.effects.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttackTargetSwitched",
          actions: [
            {
              kind: "ModifyDP",
              amount: 3000,
              duration: "forTheTurn",
              condition: { kind: "selfHasName", names: ["Eater Eve"] },
            },
          ],
        },
      ],
    });
  });

  it("observably gains start-main memory only while an opponent Digimon exists", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT22-083", as: "yuuko" }] }, 1: { battleArea: ["BT1-009"] } });
    const before = s.state.memory;
    await (
      s.engine as unknown as { fireTiming(t: EffectTiming, trigger: Record<string, never>): Promise<void> }
    ).fireTiming(EffectTiming.OnStartMainPhase, {});
    await settle(() => s.state.memory !== before);
    expect(s.state.memory).toBe(before + 1);
  });
});
