import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { compiled } from "./BT22-078.js";
import "./BT22-010.js";

describe("BT22-078 Boltmon", () => {
  it("copies only Main effects from Flame digivolution cards", () => {
    const grant = compiled.effects.find((effect) => effect.trigger === "YourTurn")?.actions[0];
    expect(grant?.kind).toBe("GrantStatic");
    expect((grant as { grant?: unknown }).grant).toMatchObject({
      copyEffectsFromDigivolution: {
        filter: expect.stringContaining("[Main]"),
        trigger: "Main",
      },
    });

    const module = getEffectModule("BT22-010");
    expect(module).toBeDefined();
    const source = {} as CardSource;
    const copied = module!.effectsForTiming(EffectTiming.OnUseOption, source);
    expect(copied).toHaveLength(1);
    expect(copied[0]?.irTrigger).toBe("Main");
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
