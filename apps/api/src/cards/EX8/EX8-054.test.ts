import { describe, expect, it, vi } from "vitest";
import { EffectDuration, EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import module from "./EX8-054.js";

describe("EX8-054", () => {
  const source = { instanceId: "source", cardId: "EX8-054", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
  it("registers Rush, Piercing, and Security Attack +1 static effects", () => expect(getEffectModule("EX8-054")!.effectsForTiming(EffectTiming.None, source)).toHaveLength(3));
  it("registers once-per-turn Justimon effect borrowing and end-of-turn attack", () => {
    const module = getEffectModule("EX8-054")!;
    expect(module.effectsForTiming(EffectTiming.OnAllyAttack, source)[0]?.maxPerTurn).toBe(1);
    expect(module.effectsForTiming(EffectTiming.OnEndTurn, source)[0]?.maxPerTurn).toBe(1);
  });
  it("borrows a When Digivolving effect from a Justimon X Antibody stack card", async () => {
    const permanent = {
      permanentId: "host",
      stack: [
        { instanceId: "justimon-x", cardId: "EX8-054" },
      ],
    };
    const source = {
      ownerSeat: 0,
      permanent: () => permanent,
      isOnBattleArea: () => true,
    } as unknown as CardSource;
    const conferStackEffects = vi.fn();
    const ctx = {
      source,
      game: { definitionOf: () => ({ nameEn: "Justimon (X Antibody)" }) },
      fx: { conferStackEffects },
    } as unknown as EffectContext;
    const effect = module.effectsForTiming(EffectTiming.OnAllyAttack, source)[0]!;

    await effect.resolve(ctx);

    expect(conferStackEffects).toHaveBeenCalledWith("host", "justimon-x", EffectDuration.UntilEachTurnEnd);
  });
});
