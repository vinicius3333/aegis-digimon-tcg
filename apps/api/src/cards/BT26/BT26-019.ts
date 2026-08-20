import { CardKind, EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT26-019 — Mailmon (BT26, Blue Lv.3 Digimon).
 *
 * Catalog source: `packages/shared/src/cards/data/cards.json`; the local KB has no
 * BT26-019 errata or Q&A, so the committed printed text is authoritative.
 *
 * Printed text:
 *   [Digivolve] Lv.2 w/[Appmon] trait: Cost 0
 *   ＜Detach ([Seven Code] trait)＞
 *   [When Attacking] If your hand has 7 or fewer cards, ＜Draw 1＞
 *
 * Clause mapping:
 *   [Digivolve] — a digivolution-cost requirement, not an effect clause; carried by
 *     CardDefinition.evoCosts in cards.json and read directly by the digivolution logic.
 *   ＜Detach＞ — printed keyword, parsed from effectText by the engine (engine/effects/
 *     detach.ts); no module clause.
 *   EffectTiming.OnUseAttack — "If your hand has 7 or fewer cards, ＜Draw 1＞". The hand
 *     size is checked when the effect resolves (the printed "if" is an activation
 *     condition, so it also gates the trigger via `when`).
 *
 *   Link face — an `isLinked` static installs a `whenLinked` watcher. The link primitive
 *     recomputes after attachment and publishes every `linkedCardInstanceIds` in the same
 *     simultaneous window, so only this newly linked Mailmon fires. Its chosen opposing
 *     Digimon/Tamer receives the `suspend` restriction until that opponent's turn ends.
 */
const cardId = "BT26-019";

const MAX_HAND_SIZE = 7;

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnUseAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking-draw`,
          description: "[When Attacking] If your hand has 7 or fewer cards, ＜Draw 1＞",
          optional: false,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.game.player(source.ownerSeat).hand.length <= MAX_HAND_SIZE,
          resolve: async (ctx) => {
            if (ctx.game.player(source.ownerSeat).hand.length > MAX_HAND_SIZE) return;
            await ctx.fx.draw(source.ownerSeat, 1);
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/link-face-when-linking-cant-suspend`,
          description: "[When Linking] 1 of your opponent's Digimon or Tamers can't suspend until their turn ends.",
          isLinked: true,
          resolve: async (ctx) => {
            const host = ctx.source.permanent();
            if (host === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenLinked",
              sourcePermanentId: host.permanentId,
              once: false,
              description: `${cardId}: linked face [When Linking] can't suspend.`,
              matches: (subCtx) => subCtx.trigger?.linkedCardInstanceIds?.includes(source.instanceId) === true,
              run: async (subCtx) => {
                const opponent = subCtx.game.opponentOf(source.ownerSeat);
                const candidates = Array.from(subCtx.game.player(opponent).battleArea)
                  .filter((permanent) => {
                    if (permanent.inBreeding || permanent.topCard === undefined) return false;
                    const definition = subCtx.game.definitionOf(permanent.topCard);
                    return definition.kinds.includes(CardKind.Digimon) || definition.kinds.includes(CardKind.Tamer);
                  })
                  .map((permanent) => permanent.permanentId);
                if (candidates.length === 0) return;
                const chosen =
                  candidates.length === 1
                    ? candidates
                    : await subCtx.ask.chooseTargets(subCtx, { candidates, min: 1, max: 1 });
                if (chosen[0] !== undefined) {
                  subCtx.fx.restrict(chosen[0], "suspend", EffectDuration.UntilOpponentTurnEnd);
                }
              },
            });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
