import { describe, expect, it, vi } from "vitest";
import { CardKind, EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import module from "./BT26-098.js";
import "../index.js";

describe("BT26-098 Queen of Thorns", () => {
  it("places both named cards face down under Lalamon before free Rosemon digivolution", async () => {
    const lalamon = {
      permanentId: "lalamon",
      inBreeding: false,
      topCard: { instanceId: "lalamon-card", cardId: "BT26-001" },
    };
    const source = {
      ownerSeat: 0,
      definition: { nameEn: "Queen of Thorns" },
      permanent: () => ({ permanentId: "option" }),
      isOnBattleArea: () => true,
    } as unknown as CardSource;
    const placeUnder = vi.fn(async () => []);
    const digivolveFromInstance = vi.fn(async () => undefined);
    const cards = {
      sunflowmon: { instanceId: "sunflowmon", cardId: "BT26-050" },
      lilamon: { instanceId: "lilamon", cardId: "BT26-051" },
      rosemon: { instanceId: "rosemon", cardId: "BT26-052" },
    };
    const ctx = {
      source,
      game: {
        player: () => ({
          trash: [cards.sunflowmon, cards.lilamon],
          hand: [cards.rosemon],
          battleArea: [lalamon],
        }),
        definitionOf: (card: { cardId: string }) => {
          const nameById: Record<string, string> = {
            "BT26-001": "Lalamon",
            "BT26-050": "Sunflowmon",
            "BT26-051": "Lilamon",
            "BT26-052": "Rosemon",
          };
          return {
            cardId: card.cardId,
            nameEn: nameById[card.cardId],
            kinds: [CardKind.Digimon],
          };
        },
        permanentById: (id: string) => (id === "lalamon" ? lalamon : undefined),
      },
      ask: {
        chooseTargets: vi.fn(async ({ candidates }: { candidates: string[] }) => candidates.slice(0, 1)),
        selectCards: vi.fn(async (_ctx: unknown, { candidates }: { candidates: string[] }) => candidates.slice(0, 1)),
      },
      fx: { placeUnder, digivolveFromInstance },
    } as unknown as EffectContext;

    const effect = module.effectsForTiming(EffectTiming.OnUseOption, source)[0]!;
    await effect.resolve(ctx);

    expect(placeUnder).toHaveBeenCalledWith("lalamon", ["sunflowmon", "lilamon"], { faceUp: false });
    expect(digivolveFromInstance).toHaveBeenCalledWith("lalamon", "rosemon", {
      payCost: false,
      ignoreRequirements: true,
    });
  });

  it("requires the bottom card under a Tamer to be face down for the use discount", () => {
    const source = {
      ownerSeat: 0,
      definition: { nameEn: "Queen of Thorns" },
      isOnBattleArea: () => true,
    } as unknown as CardSource;
    const effect = module.effectsForTiming(EffectTiming.None, source)[0]!;
    const definitionOf = () => ({ kinds: [CardKind.Tamer] });
    const context = (stack: Array<{ faceUp: boolean }>) =>
      ({
        source,
        game: { player: () => ({ battleArea: [{ topCard: { cardId: "BT26-010" }, stack }] }), definitionOf },
      }) as unknown as EffectContext;

    expect(effect.canTrigger(context([{ faceUp: true }, { faceUp: false }]))).toBe(false);
    expect(effect.canTrigger(context([{ faceUp: false }, { faceUp: true }]))).toBe(true);
  });
});
