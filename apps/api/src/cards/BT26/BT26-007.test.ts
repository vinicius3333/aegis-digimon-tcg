import { EffectTiming, type CardDefinition, type CardInstance, type Seat } from "@aegis/shared";
import { describe, expect, it, vi } from "vitest";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import module from "./BT26-007.js";
import "../index.js";

const CARD_ID = "BT26-007";

function definition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: over.cardId ?? "TEST",
    set: "TEST",
    nameEn: "Test",
    kinds: ["Digimon"] as never,
    colors: [],
    playCost: 0,
    dp: 0,
    types: [],
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function source(permanent?: unknown): CardSource {
  return {
    instanceId: "swipemon",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: definition({ cardId: CARD_ID, kinds: ["DigiEgg"] as never }),
    permanent: () => permanent as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

describe("BT26-007 Swipemon", () => {
  it("exposes the inherited optional Once Per Turn When Attacking effect", () => {
    const effect = module.effectsForTiming(EffectTiming.OnUseAttack, source())[0]!;
    expect(effect).toMatchObject({ isInherited: true, optional: true, maxPerTurn: 1 });
    expect(effect.description).toContain("hand or this Digimon's digivolution cards");
    expect(effect.description).toContain("cost reduced by 2");
  });

  it("publicly links a Seven Code card from hand, reduces its link cost 3 to 1, and preserves face/order", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host", under: [{ card: CARD_ID, as: "swipemon" }] }],
          hand: [{ card: "BT26-010", as: "candidate" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.memory).toBe(-1);
    expect(s.perm("host").linked).toHaveLength(1);
    expect(s.perm("host").linked[0]).toMatchObject({ instanceId: s.inst("candidate").instanceId, faceUp: true });
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("may link an eligible card out of this Digimon's own digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT21-009",
              as: "host",
              under: [
                { card: CARD_ID, as: "swipemon" },
                { card: "BT26-010", as: "candidate" },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.memory).toBe(0);
    expect(s.perm("host").linked.map((card) => card.instanceId)).toEqual([s.inst("candidate").instanceId]);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([s.inst("swipemon").instanceId]);
  });

  it("enforces Once Per Turn across repeated attack windows", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host", under: [{ card: CARD_ID }] }],
          hand: [
            { card: "BT26-010", as: "first" },
            { card: "BT26-019", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.perm("host").linked).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.memory).toBe(1);
  });

  it("offers only Seven Code Digimon that actually have Link, from hand and stack (Q6962)", async () => {
    const cards = [
      { instanceId: "hand-valid", cardId: "VALID" },
      { instanceId: "hand-no-link", cardId: "NO-LINK" },
      { instanceId: "hand-wrong-trait", cardId: "WRONG" },
    ] as CardInstance[];
    const stack = [{ instanceId: "stack-valid", cardId: "STACK" }] as CardInstance[];
    const defs: Record<string, CardDefinition> = {
      VALID: definition({ cardId: "VALID", types: ["Seven Code"], linkRequirement: "[Link] [Appmon] trait: Cost 3" }),
      "NO-LINK": definition({ cardId: "NO-LINK", types: ["Seven Code"] }),
      WRONG: definition({ cardId: "WRONG", types: ["Seven Codes"], linkRequirement: "[Link] [Appmon] trait: Cost 3" }),
      STACK: definition({ cardId: "STACK", types: ["Seven Code"], linkRequirement: "[Link] [Appmon] trait: Cost 2" }),
    };
    const selectCards = vi.fn(async (_ctx, options: { candidates: string[]; min: number; max: number }) => {
      expect(options).toEqual({ candidates: ["hand-valid", "stack-valid"], min: 0, max: 1 });
      return [];
    });
    const cardSource = source({ permanentId: "host", stack });
    await module.effectsForTiming(EffectTiming.OnUseAttack, cardSource)[0]!.resolve({
      source: cardSource,
      game: {
        player: () => ({ hand: cards }),
        definitionOf: (card: CardInstance) => defs[card.cardId]!,
      } as unknown as GameAccess,
      ask: { selectCards },
      fx: { gainMemory: vi.fn(), link: vi.fn() } as unknown as Primitives,
    } as unknown as EffectContext);
    expect(selectCards).toHaveBeenCalledOnce();
  });

  it("does nothing without a legal candidate and never opens a selection", async () => {
    const selectCards = vi.fn();
    const cardSource = source({ permanentId: "host", stack: [] });
    await module.effectsForTiming(EffectTiming.OnUseAttack, cardSource)[0]!.resolve({
      source: cardSource,
      game: {
        player: () => ({ hand: [{ instanceId: "wrong", cardId: "WRONG" }] }),
        definitionOf: () => definition({ types: ["Seven Code"] }),
      } as unknown as GameAccess,
      ask: { selectCards },
      fx: {} as Primitives,
    } as unknown as EffectContext);
    expect(selectCards).not.toHaveBeenCalled();
  });
});
