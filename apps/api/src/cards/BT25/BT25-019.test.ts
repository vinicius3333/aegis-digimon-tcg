import { describe, expect, it, vi } from "vitest";
import { EffectDuration, EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT25-019.js";

describe("BT25-019 UltimateBrachiomon", () => {
  it("offers the highest-DP opponent Digimon for deletion on play and digivolving", () => {
    const module = getEffectModule("BT25-019");
    expect(module?.effectsForTiming(EffectTiming.OnPlay, {} as never)).toHaveLength(1);
    expect(module?.effectsForTiming(EffectTiming.WhenDigivolving, {} as never)).toHaveLength(1);
  });

  it("scopes the end-of-turn immunity to Digimon at 5+ memory and Options at 5 or less", async () => {
    const module = getEffectModule("BT25-019");
    const effect = module?.effectsForTiming(EffectTiming.OnEndTurn, {} as never)[0];
    expect(effect).toBeDefined();
    expect(effect?.description).toContain("Digimon effects");
    expect(EffectDuration.UntilOpponentTurnEnd).toBeDefined();
  });

  it("limits both immunities to effects sourced by the opponent", async () => {
    const restrict = vi.fn();
    const permanent = { permanentId: "brachio", topCard: { instanceId: "top", cardId: "BT25-019" } };
    const source = {
      cardId: "BT25-019",
      instanceId: "source",
      ownerSeat: 0,
      permanent: () => permanent,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
    } as never;
    const effect = getEffectModule("BT25-019")!.effectsForTiming(EffectTiming.OnEndTurn, source)[0]!;
    const players = [{ battleArea: [] }, { battleArea: [] }];
    await effect.resolve({
      source,
      game: {
        state: { memory: -5, players } as never,
        player: (seat: number) => players[seat]!,
      },
      fx: { restrict },
    } as never);

    expect(restrict).toHaveBeenNthCalledWith(1, "brachio", "beAffected", EffectDuration.UntilOpponentTurnEnd, {
      fromSourceKind: ["Digimon"],
      byOpponentEffectsOnly: true,
    });
    expect(restrict).toHaveBeenNthCalledWith(2, "brachio", "beAffected", EffectDuration.UntilOpponentTurnEnd, {
      fromSourceKind: ["Option"],
      byOpponentEffectsOnly: true,
    });
  });
});
