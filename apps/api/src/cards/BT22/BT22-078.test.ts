import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { compiled } from "./BT22-078.js";
import "./BT22-010.js";
import "./BT22-095.js";

describe("BT22-078 Boltmon", () => {
  it("copies only Main effects from Flame digivolution cards", () => {
    const grant = compiled.effects.find((effect) => effect.trigger === "YourTurn")?.actions[0];
    expect(grant).toMatchObject({
      kind: "GrantStatic",
      grant: "effects",
      filter: {
        zone: "digivolutionCards",
        nameOrTrait: [{ tokens: ["Flame"], match: "trait" }],
      },
      copyTrigger: "Main",
    });

    const module = getEffectModule("BT22-010");
    expect(module).toBeDefined();
    const source = {} as CardSource;
    const copied = module!.effectsForTiming(EffectTiming.OnUseOption, source);
    expect(copied).toHaveLength(1);
    expect(copied[0]?.irTrigger).toBe("Main");
  });

  it("exposes and activates only the Flame card's copied Main effect on Boltmon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT22-078",
              as: "boltmon",
              under: [
                { card: "BT22-010", as: "flameMain" },
                { card: "BT22-095", as: "nonFlameMain" },
              ],
            },
          ],
        },
        1: { security: ["BT1-001", "BT1-002"] },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    const boltmon = s.perm("boltmon");
    const flameMain = s.inst("flameMain");
    const nonFlameMain = s.inst("nonFlameMain");
    const entries = observe(s.engine).activatableEffects(boltmon) as {
      instanceId: string;
      effectKey: string;
    }[];
    const copiedMain = entries.find(
      (entry) => entry.instanceId === flameMain.instanceId && entry.effectKey.startsWith("BT22-010/"),
    );

    expect(copiedMain?.effectKey).toContain(`/conferral/${boltmon.topCard!.instanceId}`);
    expect(entries.some((entry) => entry.instanceId === nonFlameMain.instanceId)).toBe(false);
    expect(entries.filter((entry) => entry.instanceId === flameMain.instanceId)).toHaveLength(1);

    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: flameMain.instanceId,
        effectKey: copiedMain!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(boltmon, "Raid") && observe(s.engine).hasPierce(boltmon));
    await settle();

    expect(s.state.memory).toBe(3);
    expect(
      (observe(s.engine).activatableEffects(boltmon) as { effectKey: string }[]).some(
        (entry) => entry.effectKey === copiedMain!.effectKey,
      ),
    ).toBe(false);
  });

  it("deletes exactly one lowest-level opponent Digimon once per turn when attacking", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenAttacking");
    expect(effect?.frequency).toBe("OncePerTurn");
    expect(effect?.actions).toMatchObject([
      {
        kind: "Delete",
        target: {
          count: 1,
          filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestLevel" },
        },
      },
    ]);
  });

  it("deletes the unique lowest-level opposing Digimon on the observable attack timing", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT22-078", as: "boltmon" }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "low" },
          { card: "BT22-013", as: "high" },
        ],
      },
    });
    const boltmon = s.perm("boltmon");
    const lowId = s.perm("low").permanentId;
    await (
      s.engine as unknown as { fireTiming(t: EffectTiming, trigger: { subjectPermanentId: string }): Promise<void> }
    ).fireTiming(EffectTiming.OnUseAttack, { subjectPermanentId: boltmon.permanentId });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === lowId));
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT22-013")).toBe(true);
  });
});
