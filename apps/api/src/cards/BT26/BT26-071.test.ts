import { describe, expect, it } from "vitest";
import { CardKind, EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import module from "./BT26-071.js";
import "../index.js";

describe("BT26-071 Flarerizamon", () => {
  it("does not target a Digimon in the opponent's breeding area", () => {
    const source = {
      ownerSeat: 0,
      permanent: () => ({ permanentId: "flarerizamon" }),
      isOnBattleArea: () => true,
    } as unknown as CardSource;
    const ctx = {
      source,
      game: {
        opponentOf: () => 1,
        player: (seat: number) =>
          seat === 0
            ? { battleArea: [{ permanentId: "own", inBreeding: false, topCard: { cardId: "OWN" } }] }
            : { battleArea: [{ permanentId: "breeding", inBreeding: true, topCard: { cardId: "OPP" } }] },
        definitionOf: () => ({ kinds: [CardKind.Digimon], level: 4 }),
      },
    } as unknown as EffectContext;

    const effect = module.effectsForTiming(EffectTiming.OnPlay, source)[0]!;
    expect(effect.canActivate(ctx)).toBe(false);
  });
});
