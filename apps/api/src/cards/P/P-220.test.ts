import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./P-220.js";

describe("P-220 Millenniummon", () => {
  it("provides Reboot and Blocker continuously", () => {
    const effects = getEffectModule("P-220")!.effectsForTiming(EffectTiming.None, {
      isOnBattleArea: () => true,
    } as any);
    expect(effects.map((effect) => effect.effectKey)).toEqual(["P-220/reboot", "P-220/blocker"]);
  });

  it("returns three cost cards and only offers played trash Digimon at different levels", async () => {
    const cards = [
      { instanceId: "cost-1", cardId: "C1" },
      { instanceId: "cost-2", cardId: "C2" },
      { instanceId: "cost-3", cardId: "C3" },
      { instanceId: "play-5", cardId: "P5" },
      { instanceId: "play-5b", cardId: "P5B" },
      { instanceId: "play-6", cardId: "P6" },
    ];
    const definitions: Record<string, Record<string, unknown>> = {
      C1: { kinds: [], types: ["Composite"] },
      C2: { kinds: [], types: ["DM"] },
      C3: { kinds: [], types: ["Wicked God"] },
      P5: { kinds: ["Digimon"], level: 5, types: ["Composite"] },
      P5B: { kinds: ["Digimon"], level: 5, types: ["Ver.3"] },
      P6: { kinds: ["Digimon"], level: 6, types: ["Ver.5"] },
    };
    const owner = { trash: cards.slice(), battleArea: [], hand: [], deck: [], security: [], eggDeck: [] };
    const opponent = { trash: [], battleArea: [], hand: [], deck: [], security: [], eggDeck: [] };
    const selections: string[][] = [];
    const played: string[][] = [];
    const effect = getEffectModule("P-220")!.effectsForTiming(EffectTiming.OnDestroyedAnyone, {
      ownerSeat: 0,
      definition: { effectText: "" },
    } as any)[0]!;
    await effect.resolve({
      source: { ownerSeat: 0 } as any,
      game: {
        player: (seat: number) => (seat === 0 ? owner : opponent),
        definitionOf: (card: { cardId: string }) => definitions[card.cardId],
        opponentOf: () => 1,
      } as any,
      ask: {
        optional: async () => true,
        selectCards: async (_ctx: unknown, options: { candidates: string[] }) => {
          selections.push(options.candidates);
          return selections.length === 1
            ? ["cost-1", "cost-2", "cost-3"]
            : selections.length === 2
              ? ["play-5"]
              : ["play-6"];
        },
      },
      fx: {
        returnToDeck: async () => {},
        playInstances: async (ids: string[]) => {
          played.push(ids);
        },
      },
    } as any);
    expect(selections[2]).toEqual(["play-6"]);
    expect(played).toEqual([["play-5", "play-6"]]);
  });
});
