import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
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
});
