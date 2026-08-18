import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardKind, Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { digivolveCostStatic, staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// P-072 MetalGreymon: Alterous Mode — hand-written EffectModule.
//
//
//     This card can digivolve from any Digimon named [MetalGreymon] for cost 0,
//     ignoreDigivolutionRequirement: false. PermanentCondition: top card name contains
//     "MetalGreymon" (TopCard.CardNames.Contains("MetalGreymon")).
//
//   EffectTiming.None (rule implementation):
//     Also treated as [MetalGreymon] — always active. Grants the "MetalGreymon" name alias
//     to this card's instance (always-on, unconditional).
//     KB Q4173: (Rule) Name: also treated as [MetalGreymon]. Always applies.
//
//   EffectTiming.OnEnterFieldAnyone ([When Digivolving]):
//     If you have a Tamer in play, delete 1 of your opponent's Digimon with 5000 DP or less.
//       owner has a Tamer in play.
//
//   EffectTiming.WhenPermanentWouldBeDeleted | WhenReturntoHandAnyone | WhenReturntoLibraryAnyone
//     ([All Turns][Inherited]):
//     When this Digimon has [Greymon] or [Omnimon] in its name and an effect would delete it
//     or return it to your hand or deck, you may trash 2 cards of the same level in this
//     Digimon's digivolution cards to prevent it from leaving play.
//       of the same level exist in the stack.
//
// KB rulings (binding):
//   Q4172: trash 2 cards of the SAME level as each other (not same level as this Digimon).
//   Q4173: also treated as [MetalGreymon] always.
//
const cardId = "P-072";

function hasTamerInPlay(ctx: EffectContext, source: CardSource): boolean {
  return Array.from(ctx.game.player(source.ownerSeat).battleArea).some((perm) => {
    if (perm.topCard === undefined) return false;
    return ctx.game.definitionOf(perm.topCard).kinds.includes("Tamer" as CardKind);
  });
}

function opponentDigimonLe5000(ctx: EffectContext, source: CardSource): Permanent[] {
  const oppSeat = ctx.game.opponentOf(source.ownerSeat);
  return Array.from(ctx.game.player(oppSeat).battleArea).filter((perm) => {
    if (perm.topCard === undefined) return false;
    const def = ctx.game.definitionOf(perm.topCard);
    if (!def.kinds.includes("Digimon" as CardKind)) return false;
    return (perm.currentDP ?? 0) <= 5000;
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const out: Effect[] = [];

    if (timing === EffectTiming.None) {
      // --- Static 1: name alias — also treated as [MetalGreymon] (always-on, KB Q4173). ---
      out.push(
        staticModifier({
          source,
          effectKey: `${cardId}/static-name-alias-metalgreymon`,
          description: "(Rule) Name: Also treated as [MetalGreymon] (KB Q4173).",
          optional: false,
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.grantNameTrait(self.permanentId, "name", ["MetalGreymon"], EffectDuration.Permanent);
          },
        }),
      );

      // --- Static 2: digivolve from MetalGreymon-named Digimon for cost 0. ---
      // whose top card name contains "MetalGreymon". This card is a Level 5 (cost 7 to play),
      // and it can digivolve from MetalGreymon for free. The `digivolveCostStatic` builder
      // has NO on-field base guard (it targets the card IN HAND being digivolved INTO).
      out.push(
        digivolveCostStatic({
          source,
          effectKey: `${cardId}/static-digivolve-from-metalgreymon-free`,
          description: "Digivolve from any Digimon with [MetalGreymon] in its name for cost 0.",
          optional: false,
          resolve: async (ctx) => {
            // Record a continuous digivolve-cost reduction: digivolving INTO this card (P-072)
            // from a permanent whose top card name contains "MetalGreymon" costs 0.
            // m.target = the base permanent being digivolved; m.into = the card being digivolved INTO.
            ctx.fx.changeEvoCost(
              (m) => {
                // Gate on digivolving INTO this specific card.
                if (m.into?.cardId !== cardId) return false;
                // The base permanent's top card must have MetalGreymon in its name.
                if (m.target.topCard === undefined) return false;
                const baseDef = ctx.game.definitionOf(m.target.topCard);
                return baseDef.nameEn.includes("MetalGreymon");
              },
              0,
              { setFixed: true },
            );
          },
        }),
      );

      out.push(
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-prevent-effect-leave`,
          description:
            "[All Turns] When this [Greymon]/[Omnimon] Digimon would be deleted or " +
            "returned to the hand or deck by an effect, trash 2 same-level digivolution " +
            "cards to prevent it from leaving play.",
          optional: false,
          isInherited: true,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const host = ctx.source.permanent();
            if (host === undefined) return;
            const hostId = host.permanentId;

            ctx.fx.subscribeReplacement({
              event: "wouldLeavePlay",
              sourcePermanentId: hostId,
              mode: "prevent",
              description: `${cardId} inherited effect-leave prevention`,
              causeAllows: (cause) => cause === "byEffect",
              protects: (_subCtx, leavingId) => leavingId === hostId,
              preventCheck: async (subCtx, leavingId) => {
                const current = subCtx.game.permanentById(leavingId);
                if (current?.topCard === undefined) return false;

                const currentName = subCtx.game.definitionOf(current.topCard).nameEn;
                if (!/Greymon|Omnimon/i.test(currentName)) return false;

                const cardsByLevel = new Map<number, string[]>();
                for (const card of current.stack) {
                  const level = subCtx.game.definitionOf(card).level;
                  if (level === undefined) continue;
                  const atLevel = cardsByLevel.get(level) ?? [];
                  atLevel.push(card.instanceId);
                  cardsByLevel.set(level, atLevel);
                }

                const eligibleLevels = Array.from(cardsByLevel.entries())
                  .filter(([, cards]) => cards.length >= 2)
                  .map(([level]) => level);
                if (eligibleLevels.length === 0) return false;

                const accepted = await subCtx.ask.optional(
                  subCtx,
                  "Trash 2 same-level digivolution cards to prevent this Digimon from leaving play?",
                );
                if (!accepted) return false;

                let chosenLevel = eligibleLevels[0]!;
                if (eligibleLevels.length > 1) {
                  const option = await subCtx.ask.chooseOption(
                    subCtx,
                    eligibleLevels.map((level) => `Level ${level}`),
                  );
                  chosenLevel = eligibleLevels[option] ?? chosenLevel;
                }

                const chosen = await subCtx.ask.selectCards(subCtx, {
                  candidates: cardsByLevel.get(chosenLevel)!,
                  min: 2,
                  max: 2,
                });
                if (chosen.length !== 2) return false;
                const trashed = await subCtx.fx.trash(chosen);
                return trashed.length === 2;
              },
            });
          },
        }),
      );
    }

    if (timing === EffectTiming.WhenDigivolving) {
      // [When Digivolving] If you have a Tamer in play, delete 1 of your opponent's Digimon
      // with 5000 DP or less.
      out.push(
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-delete-dp-5000`,
          description:
            "[When Digivolving] If you have a Tamer in play, delete 1 of your opponent's " +
            "Digimon with 5000 DP or less.",
          optional: false,
          canActivate: (ctx) =>
            hasTamerInPlay(ctx, source) && opponentDigimonLe5000(ctx, source).length > 0,
          resolve: async (ctx) => {
            if (!hasTamerInPlay(ctx, source)) return;
            const targets = opponentDigimonLe5000(ctx, source);
            if (targets.length === 0) return;
            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates: targets.map((p) => p.permanentId),
              min: 1,
              max: 1,
            });
            if (chosen.length > 0) {
              await ctx.fx.deletePermanent(chosen, "byEffect");
            }
          },
        }),
      );
    }

    return out;
  },
};

registerCard(module);
export default module;
