import { describe, it, expect } from "vitest";
import { EffectTiming, type CardDefinition, type PlayerState } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { ReplacementInstallInstead } from "../../engine/effects/EffectContext.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for P-214 (Betamon X Antibody) — [On Play] by placing this Digimon as the bottom
// digivolution card of a friendly [Seadramon]-text Digimon, return 1 opponent Digimon with a
// level <= a chosen friendly [Seadramon]'s level to the bottom of the deck.
// source: documented behavior.
//
// FAILS-WHEN-REVERTED: the level-bounded opponent Digimon is returned to the deck (leaves the
// battle area) only because the level-comparison-via-reference resolves. A no-op leaves it.

describe("P-214 [On Play] tuck under a friendly [Seadramon], return a level-bounded opponent Digimon", () => {
  it("returns the opponent Digimon (level <= chosen Seadramon's level) to the deck", async () => {
    const s = setupEngine(
      {
        0: {
          // Friendly Seadramon-text Digimon (MetalSeadramon, Lv.6) to tuck under and compare against.
          battleArea: [{ card: "BT15-031", dp: 12000 }],
          hand: [{ card: "P-214", as: "betamon" }],
        },
        1: {
          // Opponent Lv.3 Digimon (<= Lv.6) — eligible for the return.
          battleArea: [{ card: "BT1-009", dp: 3000, as: "oppDigimon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const p1 = s.state.players[1] as PlayerState;
    const oppDigimonId = s.perm("oppDigimon").permanentId;
    const oppTopId = s.perm("oppDigimon").topCard!.instanceId;
    s.state.memory = 4; // exact play cost
    const oppDeckBefore = p1.deck.length;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("betamon").instanceId })).toEqual({
      ok: true,
    });

    await settle(() => p1.deck.some((c) => c.instanceId === oppTopId));

    // The opponent Lv.3 Digimon was returned to the deck bottom (left the battle area).
    expect(p1.deck.length).toBe(oppDeckBefore + 1);
    expect(p1.deck.some((c) => c.instanceId === oppTopId)).toBe(true);
    expect(p1.battleArea.some((perm) => perm.permanentId === oppDigimonId)).toBe(false);
  });

  it("installs Decode for non-battle removal and plays one exact Betamon or ModokiBetamon", async () => {
    const stack = [
      { instanceId: "betamon", cardId: "BT1-004" },
      { instanceId: "near-match", cardId: "P-214" },
    ];
    const source = { permanent: () => ({ permanentId: "self", stack }), isOnBattleArea: () => true } as any;
    let replacement: ReplacementInstallInstead | undefined;
    const definitionOf = (card: { cardId: string }): CardDefinition =>
      ({
        cardId: card.cardId,
        set: "BT1",
        nameEn: card.cardId === "BT1-004" ? "Betamon" : "Betamon (X Antibody)",
        kinds: ["Digimon"] as never,
      }) as CardDefinition;
    const effect = getEffectModule("P-214")!
      .effectsForTiming(EffectTiming.None, source)
      .find((entry) => entry.effectKey === "P-214/decode-keyword")!;
    await effect.resolve({
      source,
      game: { definitionOf } as any,
      fx: { grantKeyword: () => {}, subscribeReplacement: (entry: ReplacementInstallInstead) => (replacement = entry) },
    } as any);

    expect(replacement).toMatchObject({ event: "wouldLeavePlay", mode: "instead", sourcePermanentId: "self" });
    expect(replacement!.causeAllows!("byEffect", 0 as any, false)).toBe(true);
    expect(replacement!.causeAllows!("byBattle", 0 as any, false)).toBe(false);
    const played: unknown[] = [];
    await replacement!.apply!({
      source,
      game: { definitionOf } as any,
      ask: { selectCards: async (_ctx: unknown, options: { candidates: string[] }) => [options.candidates[0]!] },
      fx: { playInstances: async (ids: string[], options: unknown) => played.push([ids, options]) },
    } as any);
    expect(played).toEqual([[["betamon"], { payCost: false }]]);
  });
});
