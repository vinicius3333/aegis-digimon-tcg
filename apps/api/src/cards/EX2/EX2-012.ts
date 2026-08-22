import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardInstance } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenDigivolving, onDeletion, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { registerIrCard } from "../../engine/effects/interpreter.js";
import type { CompiledCard } from "@aegis/shared";

const cardId = "EX2-012";

function isGuilmon(def: { nameEn: string }): boolean {
  return def.nameEn === "Guilmon" || def.nameEn.includes("Guilmon");
}

function isTakatoMatsuki(def: { nameEn: string }): boolean {
  return def.nameEn === "Takato Matsuki" ||
    def.nameEn === "TakatoMatsuki" ||
    def.nameEn.replace(/\s+/g, "") === "TakatoMatsuki";
}

function guilmonCandidates(ctx: EffectContext, ownerSeat: 0 | 1): CardInstance[] {
  const owner = ctx.game.player(ownerSeat);
  const result: CardInstance[] = [];
  for (const c of owner.hand) {
    if (isGuilmon(ctx.game.definitionOf(c))) result.push(c);
  }
  for (const c of owner.trash) {
    if (isGuilmon(ctx.game.definitionOf(c))) result.push(c);
  }
  return result;
}

function takatoCandidates(ctx: EffectContext, ownerSeat: 0 | 1): CardInstance[] {
  const owner = ctx.game.player(ownerSeat);
  const result: CardInstance[] = [];
  for (const c of owner.hand) {
    if (isTakatoMatsuki(ctx.game.definitionOf(c))) result.push(c);
  }
  for (const c of owner.trash) {
    if (isTakatoMatsuki(ctx.game.definitionOf(c))) result.push(c);
  }
  return result;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const ownerSeat = source.ownerSeat as 0 | 1;

    // (Rule) Name: Also treated as [ChaosGallantmon].
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/static-chaosGallantmon-name`,
          description: "(Rule) This card is also treated as [ChaosGallantmon].",
          when: () => true,
          resolve: async (ctx) => {
            const perm = ctx.source.permanent();
            if (perm === undefined) return;
            ctx.fx.grantNameTrait(
              perm.permanentId,
              "name",
              ["ChaosGallantmon"],
              EffectDuration.Permanent,
            );
          },
        }),
      ];
    }

    // [When Digivolving] Delete 1 of your opponent's Digimon with 10000 DP or less.
    // If no Digimon was deleted by this effect, trash the top 5 cards of both players' decks.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-delete-or-mill-5`,
          description:
            "[When Digivolving] Delete 1 of your opponent's Digimon with 10000 DP or less. " +
            "If no Digimon was deleted by this effect, trash the top 5 cards of both players' decks.",
          optional: false,
          resolve: async (ctx) => {
            const oppSeat = ctx.game.opponentOf(ownerSeat);
            const opp = ctx.game.player(oppSeat);

            const lte10kCandidates = opp.battleArea
              .filter((p) => {
                if (p.inBreeding || p.topCard === undefined) return false;
                const def = ctx.game.definitionOf(p.topCard);
                if (!isDigimon(def)) return false;
                return p.currentDP <= 10000;
              })
              .map((p) => p.permanentId);

            let deleted = 0;
            if (lte10kCandidates.length > 0) {
              // KB Q3299: must choose if a valid target exists.
              const chosen = await ctx.ask.chooseTargets(ctx, {
                candidates: lte10kCandidates,
                min: 1,
                max: 1,
              });
              deleted = await ctx.fx.deletePermanent(chosen);
            }

            // If no Digimon was deleted (Q3298/Q3302: delete failed or no candidate):
            if (deleted === 0) {
              for (const seat of [ownerSeat, oppSeat]) {
                const revealed = await ctx.fx.reveal(seat, 5);
                if (revealed.length === 0) continue;
                const ids = revealed.map((c) => c.instanceId);
                await ctx.fx.trash(ids);
                await ctx.fx.fireOnDiscardLibrary(seat, ids);
                for (const c of revealed) {
                  await ctx.fx.fireWhenTrashedFromDeck(c.cardId, c.instanceId);
                }
              }
            }
          },
        }),
      ];
    }

    // [On Deletion] You may play 1 [Guilmon] and 1 [Takato Matsuki] from your hand
    // and/or trash without paying their memory costs.
    if (timing === EffectTiming.OnDestroyedAnyone) {
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/on-deletion-play-guilmon-and-takato`,
          description:
            "[On Deletion] You may play 1 [Guilmon] and 1 [Takato Matsuki] from your hand " +
            "and/or trash without paying their memory costs.",
          optional: true,
          canActivate: (ctx) =>
            guilmonCandidates(ctx, ownerSeat).length > 0 ||
            takatoCandidates(ctx, ownerSeat).length > 0,
          resolve: async (ctx) => {
            // Play 1 [Guilmon] from hand/trash without paying cost
            const guilmons = guilmonCandidates(ctx, ownerSeat);
            if (guilmons.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: guilmons.map((c) => c.instanceId),
                min: 0,
                max: 1,
              });
              if (chosen.length > 0) {
                await ctx.fx.playInstances(chosen, { payCost: false });
              }
            }

            // Play 1 [Takato Matsuki] from hand/trash without paying cost
            const takatos = takatoCandidates(ctx, ownerSeat);
            if (takatos.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: takatos.map((c) => c.instanceId),
                min: 0,
                max: 1,
              });
              if (chosen.length > 0) {
                await ctx.fx.playInstances(chosen, { payCost: false });
              }
            }
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);

// Hand-authored compiled IR keeps the server-authoritative path faithful to the legacy module.
// In particular, the deletion branch is executable rather than RawUnparsed: both named cards
// may come from hand or trash and are played without cost.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [{ kind: "GrantStatic", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, grant: "name", tokens: ["ChaosGallantmon"] }],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        { kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 10000 } }, count: 1 } },
        { kind: "TrashTopDeck", controller: "both", amount: 5, condition: { kind: "ifThisEffectDidNotDelete", raw: "no Digimon was deleted by this effect" } },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Guilmon"], match: "name" }] }, count: 1 }, from: ["hand", "trash"], payCost: false, optional: true },
        { kind: "PlayWithoutCost", target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Takato Matsuki"], match: "name" }] }, count: 1 }, from: ["hand", "trash"], payCost: false, optional: true },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard(cardId, compiled);
export default module;
