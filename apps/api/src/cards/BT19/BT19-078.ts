import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardInstance, Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, onPlay, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT19-078";
const motherDReaper = "Mother D-Reaper";
const adr01Jeri = "ADR-01 Jeri";

function nameEqualsTop(ctx: EffectContext, permanent: Permanent, name: string): boolean {
  if (permanent.topCard == null) return false;
  return ctx.game.definitionOf(permanent.topCard).nameEn === name;
}

/** Owner battle-area [Mother D-Reaper] permanents (top card is that Digimon). */
function ownerMothers(ctx: EffectContext, source: CardSource): Permanent[] {
  const owner = ctx.game.player(source.ownerSeat);
  return Array.from(owner.battleArea).filter((permanent) => nameEqualsTop(ctx, permanent, motherDReaper));
}

/** Opponent battle-area Digimon (debuff candidates). */
function opponentDigimon(ctx: EffectContext, source: CardSource): Permanent[] {
  const oppSeat = ctx.game.opponentOf(source.ownerSeat);
  return Array.from(ctx.game.player(oppSeat).battleArea).filter((permanent) => {
    if (permanent.topCard == null) return false;
    return isDigimon(ctx.game.definitionOf(permanent.topCard));
  });
}

/** [ADR-01 Jeri] instances in this permanent's digivolution stack. */
function jeriInStack(ctx: EffectContext, permanent: Permanent): CardInstance[] {
  return Array.from(permanent.stack).filter((card) => ctx.game.definitionOf(card).nameEn === adr01Jeri);
}

async function chooseOnePermanent(ctx: EffectContext, permanents: Permanent[]): Promise<Permanent | undefined> {
  if (permanents.length === 0) return undefined;
  if (permanents.length === 1) return permanents[0];
  const byTopId = new Map<string, Permanent>(permanents.map((permanent) => [permanent.topCard!.instanceId, permanent]));
  const chosen = await ctx.ask.chooseTargets(ctx, {
    candidates: Array.from(byTopId.keys()),
    min: 1,
    max: 1,
  });
  const id = chosen[0];
  return id === undefined ? undefined : byTopId.get(id);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // ----- [On Play] -1000 DP per chosen Mother D-Reaper's digivolution card ----------
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-dp-debuff`,
          description:
            "[On Play] For each digivolution card of 1 of your [Mother D-Reaper]s, 1 of your opponent's Digimon gets -1000 DP for the turn.",
          optional: false,
          // the chooser has nothing to pick and the debuff resolves to 0; we still require an
          canActivate: (ctx) => opponentDigimon(ctx, source).length >= 1,
          resolve: async (ctx) => {
            const mothers = ownerMothers(ctx, source);
            const chosenMother = await chooseOnePermanent(ctx, mothers);
            if (chosenMother === undefined) return;

            const debuff = -1000 * chosenMother.stack.length;
            if (debuff === 0) return;

            const candidates = opponentDigimon(ctx, source);
            const chosenTarget = await chooseOnePermanent(ctx, candidates);
            if (chosenTarget === undefined) return;

            // ChangeDigimonDP(..., EffectDuration.UntilEachTurnEnd).
            ctx.fx.modifyDP(chosenTarget.permanentId, debuff, EffectDuration.UntilEachTurnEnd);
          },
        }),
      ];
    }

    // ----- [Main] place this Digimon under a [Mother D-Reaper] w/o [ADR-01 Jeri] -------
    if (timing === EffectTiming.OnDeclaration) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-place-under-mother`,
          description:
            "[Main] Place this Digimon as the bottom digivolution card of 1 of your [Mother D-Reaper] without [ADR-01 Jeri] in its digivolution cards.",
          optional: false,
          canActivate: (ctx) =>
            ctx.source.isOnBattleArea() &&
            ownerMothers(ctx, source).some((mother) => jeriInStack(ctx, mother).length < 1),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            const eligible = ownerMothers(ctx, source).filter((mother) => jeriInStack(ctx, mother).length < 1);
            const chosenMother = await chooseOnePermanent(ctx, eligible);
            if (chosenMother === undefined) return;

            // Relocate THIS whole permanent under the chosen Mother as its bottom
            // digivolution card (documented behavior IPlacePermanentToDigivolutionCards: the source
            // permanent ceases to exist and its cards go under the destination).
            ctx.fx.relocatePermanent(chosenMother.permanentId, self.permanentId);
          },
        }),
      ];
    }

    // ----- [Opponent's Turn] (inherited) play [ADR-01 Jeri] + optional redirect --------
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/inherited-play-jeri-redirect`,
          description:
            "[Opponent's Turn] When any of your opponent's Digimon attack, you may play 1 [ADR-01 Jeri] from this Digimon's digivolution cards without paying the cost. If you played, you may change the attack target to the Digimon played by this effect.",
          optional: true,
          isInherited: true,
          // in this permanent's digivolution cards. The OnAllyAttack timing fires for an
          // attack; the inherited host is the source. Require a Jeri in the stack to offer.
          canActivate: (ctx) => {
            const self = ctx.source.permanent();
            return self !== undefined && jeriInStack(ctx, self).length >= 1;
          },
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            const jeri = jeriInStack(ctx, self);
            if (jeri.length === 0) return;

            // Play 1 [ADR-01 Jeri] from this permanent's digivolution cards for free.
            const pickIds =
              jeri.length === 1
                ? [jeri[0]!.instanceId]
                : await ctx.ask.selectCards(ctx, {
                    candidates: jeri.map((c) => c.instanceId),
                    min: 1,
                    max: 1,
                  });
            const toPlay = pickIds[0];
            if (toPlay === undefined) return;

            const played = await ctx.fx.playInstances([toPlay], { payCost: false });
            const newPermanent = played[0];
            if (newPermanent === undefined) return;

            // If you played, you MAY change the attack target to the played Digimon (Q3137:
            // optional). The played permanent is the sole redirect candidate.
            await ctx.fx.redirectAttack([newPermanent.permanentId], { optional: true });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
