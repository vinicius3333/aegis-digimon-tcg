import { describe, it, expect, vi } from "vitest";
import { EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./BT26-037.js";

// A3 for BT26-037 (Weatherdramon, BT26): "[On Play] [When Digivolving] You may link 1
// level 3 Digimon card with the [Navi], [System] or [Seven Code] trait from this
// Digimon's digivolution cards to this Digimon without paying the cost."
//
// FAILS-WHEN-REVERTED: dropping the trait filter (no eligible candidate) leaves the
// link primitive uncalled; this test asserts it fires with exactly the eligible card.

const CARD_ID = "BT26-037";

function fakeDef(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: over.cardId ?? "AD1-001",
    set: "BT26",
    nameEn: over.nameEn ?? "Test",
    kinds: (over.kinds as never) ?? (["Digimon"] as never),
    colors: (over.colors as never) ?? ([] as never),
    playCost: over.playCost ?? 0,
    dp: over.dp ?? 0,
    level: over.level,
    types: over.types ?? [],
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makeSource(stack: { instanceId: string; cardId: string }[]): CardSource {
  return {
    instanceId: "weatherdramon-top",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: fakeDef({ cardId: CARD_ID }),
    permanent: () => ({ permanentId: "weatherdramon-perm", stack }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

describe("BT26-037 [On Play]/[When Digivolving]: link a level-3 eligible-trait digivolution card", () => {
  it("offers only the eligible ([Navi]/[System]/[Seven Code]) stack card and links it", async () => {
    const eligible = { instanceId: "stack-eligible", cardId: "NAVI-003" };
    const sameTraitWithoutLink = { instanceId: "stack-no-link", cardId: "NAVI-004" };
    const ineligible = { instanceId: "stack-ineligible", cardId: "OTHER-003" };
    const source = makeSource([eligible, sameTraitWithoutLink, ineligible]);

    const game: GameAccess = {
      definitionOf: (card: { cardId: string }) =>
        fakeDef({
          cardId: card.cardId,
          level: 3,
          types: card.cardId === "NAVI-003" || card.cardId === "NAVI-004" ? ["Navi"] : [],
          linkRequirement: card.cardId === "NAVI-003" ? "[Link] [Appmon] trait: Cost 1" : undefined,
        }),
    } as unknown as GameAccess;

    const linked: string[][] = [];
    const fx = {
      link: vi.fn(async (_targetId: string, ids: string[]) => {
        linked.push(ids);
        return ids;
      }),
    } as unknown as Primitives;

    const ask = {
      selectCards: vi.fn(async (_ctx: unknown, opts: { candidates: string[] }) => [opts.candidates[0]!]),
    } as unknown as EffectContext["ask"];

    const ctx = { source, trigger: {}, game, fx, ask } as unknown as EffectContext;

    const module = getEffectModule(CARD_ID);
    expect(module).toBeDefined();
    const effects = module!.effectsForTiming(EffectTiming.OnPlay, source);
    const linkEffect = effects.find((e) => e.effectKey === `${CARD_ID}/on-play-link`);
    expect(linkEffect).toBeDefined();

    await linkEffect!.resolve(ctx);

    expect(linked).toEqual([["stack-eligible"]]);
  });
});
