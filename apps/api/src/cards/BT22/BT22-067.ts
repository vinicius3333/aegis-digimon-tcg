import { CardColor, EffectDuration, EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { CardDefinition, CardInstance, Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, staticModifier, turnTiming, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT22-067";
const RAID_COST_GAIN_DP = 3000;
const ALL_TURNS_REVEAL = 3;
const PLAYABLE_MAX_COST = 4;

/** This card's owner Digimon in the battle area — the documented behavior SharedIsYourDigimon candidates
 *  (the effect runtime.IsPermanentExistsOnOwnerBattleAreaDigimon). */
function yourBattleDigimon(ctx: EffectContext, source: CardSource): Permanent[] {
  return ctx.game
    .player(source.ownerSeat)
    .battleArea.filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)));
}

const gainDpThenMayAttack = async (ctx: EffectContext, source: CardSource): Promise<void> => {
  const dpCandidates = yourBattleDigimon(ctx, source);
  if (dpCandidates.length === 0) return;

  // Step 1 — mandatory +3000 DP onto one of your Digimon (canNoSelect: false).
  const dpPick = await ctx.ask.chooseTargets(ctx, {
    candidates: dpCandidates.map((p) => p.permanentId),
    min: 1,
    max: 1,
  });
  const dpTargetId = dpPick[0];
  if (dpTargetId !== undefined) {
    ctx.fx.modifyDP(dpTargetId, RAID_COST_GAIN_DP, EffectDuration.UntilOpponentTurnEnd);
  }

  // Step 2 — optionally have one of your Digimon attack a player. Re-derive the candidate
  // set after the buff: only your Digimon that can currently declare an attack (documented behavior
  // SharedAttackingDigimon: SharedIsYourDigimon && permanent.CanAttack).
  const attackerCandidates = yourBattleDigimon(ctx, source).filter((p) => !p.isSuspended);
  if (attackerCandidates.length === 0) return;

  const attackPick = await ctx.ask.chooseTargets(ctx, {
    candidates: attackerCandidates.map((p) => p.permanentId),
    min: 0, // canNoSelect: true → the controller may decline
    max: 1,
  });
  const attackerId = attackPick[0];
  if (attackerId === undefined) return;

  // forceAttack runs the full attack lifecycle and asks the controller for the target.
  // (defenderCondition: () => false); forceAttack also offers any SUSPENDED enemy Digimon
  // as a target. There is no player-only attack primitive on ctx.fx — this minor over-
  // permissiveness is shared by every effect-driven "may attack a player" card and is not
  // specific to this port.
  await ctx.fx.forceAttack(attackerId);
};

/** [All Turns] candidate predicate: a play-cost-≤4
 *  CanPlayAsNewPermanent). */
function isPlayableRevealedCard(def: CardDefinition): boolean {
  if (def.playCost < 0 || def.playCost > PLAYABLE_MAX_COST) return false;
  if (!(isDigimon(def) || isTamer(def))) return false;
  return def.colors.includes(CardColor.Black) || def.colors.includes(CardColor.Red);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // subsystems read. Authored as continuous grants re-recorded each recompute pass
    // (recomputeContinuousEffects clears then re-fires EffectTiming.None, so re-granting
    // with UntilEachTurnEnd is idempotent — the EX11-074 keyword pattern).
    if (timing === EffectTiming.None) {
      const keyword = (key: string, label: string, kw: string): Effect =>
        staticModifier({
          source,
          effectKey: `${cardId}/${key}`,
          description: label,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self !== undefined) ctx.fx.grantKeyword(self.permanentId, kw, EffectDuration.UntilEachTurnEnd);
          },
        });
      return [keyword("raid", "＜Raid＞", "Raid"), keyword("reboot", "＜Reboot＞", "Reboot")];
    }

    // [On Play] 1 of your Digimon gets +3000 DP until your opponent's turn ends. Then, 1 of
    // + IsExistOnBattleAreaDigimon (lines 185-211).
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-buff-attack`,
          description:
            "[On Play] 1 of your Digimon gets +3000 DP until your opponent's turn ends. " +
            "Then, 1 of your Digimon may attack a player.",
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => gainDpThenMayAttack(ctx, source),
        }),
      ];
    }

    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-buff-attack`,
          description:
            "[When Digivolving] 1 of your Digimon gets +3000 DP until your opponent's turn ends. " +
            "Then, 1 of your Digimon may attack a player.",
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => gainDpThenMayAttack(ctx, source),
        }),
      ];
    }

    // [All Turns] [Once Per Turn] When Digimon attack players, reveal the top 3 cards of
    // your deck. You may play 1 play cost 4 or lower black or red card among them without
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/all-turns-reveal-play`,
          description:
            "[All Turns] [Once Per Turn] When Digimon attack players, reveal the top 3 cards of " +
            "your deck. You may play 1 play cost 4 or lower black or red card among them without " +
            "paying the cost. Trash the rest.",
          maxPerTurn: 1,
          // the attack is in flight with no defending permanent (i.e. it targets the player).
          // The defender's presence is read from the trigger (BT1-001 idiom): an undefined
          // targetPermanentId means the attack is player-directed.
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.trigger.targetPermanentId === undefined,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            // Reveal the top 3 of the owner's deck (they stay on top, face-up, until moved).
            const revealed: CardInstance[] = await ctx.fx.reveal(source.ownerSeat, ALL_TURNS_REVEAL);
            if (revealed.length === 0) return;

            // "You may play 1 play cost 4 or lower black or red card among them without
            // paying the cost." (documented behavior rule implementation, canNoSelect via the
            const playable = revealed.filter((c) => isPlayableRevealedCard(ctx.game.definitionOf(c)));
            let playedId: string | undefined;
            if (playable.length > 0) {
              const pick = await ctx.ask.selectCards(ctx, {
                candidates: playable.map((c) => c.instanceId),
                min: 0,
                max: 1,
              });
              playedId = pick[0];
              if (playedId !== undefined) {
                await ctx.fx.playInstances([playedId], { payCost: false });
              }
            }

            // "Trash the rest." — every revealed card not
            // played goes to the trash.
            const rest = revealed.filter((c) => c.instanceId !== playedId).map((c) => c.instanceId);
            if (rest.length > 0) await ctx.fx.trash(rest);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
