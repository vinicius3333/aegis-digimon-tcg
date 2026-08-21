import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX10-063.js";

function source(): CardSource {
  return {
    instanceId: "close-tamer",
    cardId: "EX10-063",
    ownerSeat: 0,
    definition: undefined as never,
    permanent: () => ({ permanentId: "close-permanent" }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

describe("EX10-063 Close", () => {
  it("requires Close in hand before the by-condition can activate (Q5173)", () => {
    const card = source();
    const effect = getEffectModule("EX10-063")!.effectsForTiming(EffectTiming.OnStartMainPhase, card)[0]!;
    const base = {
      source: card,
      trigger: {},
      game: {
        player: () => ({ hand: [] }),
        definitionOf: () => ({ nameEn: "Sunarizamon" }),
      },
    } as never;
    expect(effect.canActivate(base)).toBe(false);
    expect(
      effect.canActivate({
        ...base,
        game: {
          player: () => ({ hand: [{ instanceId: "close", cardId: "EX10-063" }] }),
          definitionOf: () => ({ nameEn: "Close" }),
        },
      } as never),
    ).toBe(true);
  });
});
