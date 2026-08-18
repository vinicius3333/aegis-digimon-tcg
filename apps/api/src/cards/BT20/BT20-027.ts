import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, Permanent, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, staticModifier, turnTiming, whenAttacking, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT20-027 — Slayerdramon (BT20, Blue Lv.6 Digimon).
 *
 *
 * Printed text:
 *   ＜Piercing＞
 *   [On Play] / [When Digivolving] Trash any 3 digivolution cards of 1 of your opponent's
 *     Digimon. Then, delete 1 of their Digimon with no digivolution cards.
 *   [All Turns] (Once Per Turn) When your opponent's security stack is removed from, 1 of your
 *     Digimon with [Dracomon]/[Examon] in its text may unsuspend.
 *   (Inherited) [All Turns] (Once Per Turn) When any of your Digimon with [Dracomon]/[Examon] in
 *     their texts would leave the battle area other than in battle, by suspending this Digimon,
 *     they don't leave.
 *   Plus the alternate "Digivolve: 3 from [Wingdramon]/[Groundramon]" requirement (data-layer,
 *   read from effects.json — not a runtime effect).
 *
 * KB rulings (binding):
 *   Q4316/Q4318: "[Dracomon]/[Examon] in its text" = a Digimon whose text (name, traits, effects,
 *     inherited effects, requirements, etc.) contains [Dracomon] or [Examon].
 *   Q4319: the inherited leave-prevention affects ALL such Digimon at the same timing without
 *     choosing them (=> Replacement `affectsAll: true`).
 *   Q4317/Q4322: "X in its text" matches name/traits/effect text.
 *
 *   EffectTiming.None: alt digivolve requirement (data layer).
 *   EffectTiming.OnDetermineDoSecurityCheck: ＜Piercing＞ (PierceSelfEffect).
 *   EffectTiming.OnEnterFieldAnyone (two clauses): [On Play] and [When Digivolving] — same body:
 *     trash up to 3 divo cards of 1 opponent Digimon, then delete 1 opponent Digimon with no
 *     digivolution cards. Aegis splits OnEnterFieldAnyone into OnPlay / WhenDigivolving windows.
 *   EffectTiming.OnLoseSecurity: [All Turns] (Once Per Turn) when the OPPONENT's security is
 *     removed (`player == card.Owner.Enemy`), optionally unsuspend 1 own [Dracomon]/[Examon] Digimon.
 *   EffectTiming.WhenRemoveField: inherited [All Turns] (Once Per Turn) suspend this Digimon to
 *     prevent any of the controller's [Dracomon]/[Examon] Digimon from leaving (not by battle).
 */
const cardId = "BT20-027";

/** "[Dracomon]/[Examon] in its text" (KB Q4316-Q4322): match name, traits, and effect texts. */
const hasDracomonOrExamonText = (def: CardDefinition): boolean => {
  const traits: string[] = [...(def.types ?? []), ...(def.forms ?? []), ...(def.attributes ?? [])];
  const text = [
    def.nameEn,
    def.effectText ?? "",
    def.inheritedEffectText ?? "",
    def.securityEffectText ?? "",
    ...traits,
  ].join(" ");
  return text.includes("Dracomon") || text.includes("Examon");
};

/** Opponent battle-area Digimon that have at least 1 digivolution card. */
const opponentDigimonWithStack = (ctx: EffectContext, ownerSeat: Seat): Permanent[] => {
  const opponent = ctx.game.player(ctx.game.opponentOf(ownerSeat));
  return Array.from(opponent.battleArea).filter(
    (perm) => perm.topCard !== undefined && isDigimon(ctx.game.definitionOf(perm.topCard)) && perm.stack.length > 0,
  );
};

/** Opponent battle-area Digimon with NO digivolution cards. */
const opponentDigimonNoStack = (ctx: EffectContext, ownerSeat: Seat): Permanent[] => {
  const opponent = ctx.game.player(ctx.game.opponentOf(ownerSeat));
  return Array.from(opponent.battleArea).filter(
    (perm) => perm.topCard !== undefined && isDigimon(ctx.game.definitionOf(perm.topCard)) && perm.stack.length === 0,
  );
};

/** Own battle-area Digimon with [Dracomon]/[Examon] in its text. */
const ownDracomonExamonDigimon = (ctx: EffectContext, ownerSeat: Seat): Permanent[] =>
  Array.from(ctx.game.player(ownerSeat).battleArea).filter(
    (perm) =>
      perm.topCard !== undefined &&
      isDigimon(ctx.game.definitionOf(perm.topCard)) &&
      hasDracomonOrExamonText(ctx.game.definitionOf(perm.topCard)),
  );

/** Shared [On Play] / [When Digivolving] body. */
const resolveTrashThenDelete = async (ctx: EffectContext, ownerSeat: Seat): Promise<void> => {
  // Trash any 3 digivolution cards of 1 of your opponent's Digimon (isFromOnly1Permanent).
  const withStack = opponentDigimonWithStack(ctx, ownerSeat);
  if (withStack.length > 0) {
    const chosenHost = await ctx.ask.chooseTargets(ctx, {
      candidates: withStack.map((p) => p.permanentId),
      min: 1,
      max: 1,
    });
    const hostId = chosenHost[0];
    if (hostId !== undefined) {
      const host = ctx.game.permanentById(hostId);
      if (host !== undefined && host.stack.length > 0) {
        const candidates = host.stack.map((c) => c.instanceId);
        const max = Math.min(3, candidates.length);
        const picked = await ctx.ask.selectCards(ctx, { candidates, min: max, max });
        if (picked.length > 0) await ctx.fx.trashDigivolutionCards(hostId, picked);
      }
    }
  }

  // Then, delete 1 of their Digimon with no digivolution cards (re-evaluated after the trash —
  // a Digimon emptied by the trash above becomes a valid delete target).
  const noStack = opponentDigimonNoStack(ctx, ownerSeat);
  if (noStack.length > 0) {
    const chosen = await ctx.ask.chooseTargets(ctx, {
      candidates: noStack.map((p) => p.permanentId),
      min: 1,
      max: 1,
    });
    if (chosen.length > 0) await ctx.fx.deletePermanent(chosen);
  }
};

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // ＜Piercing＞ (PierceSelfEffect).
    if (timing === EffectTiming.OnDetermineDoSecurityCheck) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/piercing`,
          description: "＜Piercing＞",
          optional: false,
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self !== undefined) ctx.fx.grantPierce(self.permanentId, EffectDuration.UntilEndBattle);
          },
        }),
      ];
    }

    // [On Play] Trash any 3 divo cards of 1 opponent Digimon, then delete 1 opponent Digimon with
    // no digivolution cards.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-trash-delete`,
          description:
            "[On Play] Trash any 3 digivolution cards of 1 of your opponent's Digimon. Then, " +
            "delete 1 of their Digimon with no digivolution cards.",
          optional: false,
          canActivate: (ctx) =>
            opponentDigimonWithStack(ctx, source.ownerSeat).length > 0 ||
            opponentDigimonNoStack(ctx, source.ownerSeat).length > 0,
          resolve: (ctx) => resolveTrashThenDelete(ctx, source.ownerSeat),
        }),
      ];
    }

    // [When Digivolving] same body.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-trash-delete`,
          description:
            "[When Digivolving] Trash any 3 digivolution cards of 1 of your opponent's Digimon. " +
            "Then, delete 1 of their Digimon with no digivolution cards.",
          optional: false,
          canActivate: (ctx) =>
            opponentDigimonWithStack(ctx, source.ownerSeat).length > 0 ||
            opponentDigimonNoStack(ctx, source.ownerSeat).length > 0,
          resolve: (ctx) => resolveTrashThenDelete(ctx, source.ownerSeat),
        }),
      ];
    }

    // [All Turns] (Once Per Turn) When your opponent's security stack is removed from, 1 of your
    // Digimon with [Dracomon]/[Examon] in its text may unsuspend.
    if (timing === EffectTiming.OnLoseSecurity) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/all-turns-unsuspend-on-opponent-lose-security`,
          description:
            "[All Turns] (Once Per Turn) When your opponent's security stack is removed from, 1 " +
            "of your Digimon with [Dracomon]/[Examon] in its text may unsuspend.",
          optional: true,
          maxPerTurn: 1,
          when: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            // attacker that removed it is controlled by this card's owner.
            const attackerId = ctx.trigger.attackerPermanentId;
            if (attackerId === undefined) return false;
            const attacker = ctx.game.permanentById(attackerId);
            return attacker?.controllerSeat === source.ownerSeat;
          },
          canActivate: (ctx) => ownDracomonExamonDigimon(ctx, source.ownerSeat).length > 0,
          resolve: async (ctx) => {
            const candidates = ownDracomonExamonDigimon(ctx, source.ownerSeat).filter((p) => p.isSuspended);
            if (candidates.length === 0) return;
            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates: candidates.map((p) => p.permanentId),
              min: 0,
              max: 1,
            });
            if (chosen.length > 0) ctx.fx.unsuspend(chosen);
          },
        }),
      ];
    }

    // (Inherited) [All Turns] (Once Per Turn) When any of your Digimon with [Dracomon]/[Examon]
    // in their texts would leave the battle area other than in battle, by suspending this Digimon,
    // they don't leave. Installed as a continuous leave-prevention replacement anchored on the
    // host permanent (the BT9-012 pattern).
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-prevent-leave-by-suspend`,
          description:
            "[All Turns] (Once Per Turn) When any of your Digimon with [Dracomon]/[Examon] in " +
            "their texts would leave the battle area other than in battle, by suspending this " +
            "Digimon, they don't leave.",
          isInherited: true,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const host = ctx.source.permanent();
            if (host === undefined) return;
            const hostId = host.permanentId;
            const ownerSeat = source.ownerSeat;

            ctx.fx.subscribeReplacement({
              event: "wouldLeavePlay",
              sourcePermanentId: hostId,
              mode: "prevent",
              description:
                "[All Turns] (Once Per Turn) Suspend this Digimon to prevent your [Dracomon]/" +
                "[Examon]-text Digimon from leaving the battle area (not by battle).",
              // Q4319: affects ALL such Digimon at the timing without choosing them.
              affectsAll: true,
              // "other than in battle" — a byBattle removal must NOT fire this.
              causeAllows: (cause) => cause !== "byBattle",
              // Once Per Turn (stable per-turn key).
              oncePerTurnKey: `${cardId}/${hostId}/prevent-leave`,
              protects: (subCtx, leavingId) => {
                const leaving = subCtx.game.permanentById(leavingId);
                if (leaving === undefined || leaving.topCard === undefined) return false;
                // "your Digimon with [Dracomon]/[Examon] in their texts".
                if (leaving.controllerSeat !== ownerSeat) return false;
                const def = subCtx.game.definitionOf(leaving.topCard);
                return isDigimon(def) && hasDracomonOrExamonText(def);
              },
              preventCheck: async (subCtx) => {
                const current = subCtx.game.permanentById(hostId);
                if (current === undefined || current.isSuspended) return false;
                // "by suspending this Digimon" — the activation cost.
                const paid = subCtx.fx.payActivationCost?.(hostId, "suspend") ?? false;
                return paid;
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
