import { CardKind, EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, whenDigivolving, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT20-071";

function hasSocOrSeekersTrait(def: CardDefinition): boolean {
  const types = def.types as string[] | undefined;
  return types?.some((t) => t === "SoC" || t === "SEEKERS") ?? false;
}

/** Shared resolve body for [On Play] and [When Digivolving]. */
async function trashHandAndGrantRaid(
  ctx: Parameters<Effect["resolve"]>[0],
): Promise<void> {
  const owner = ctx.game.player(ctx.source.ownerSeat);
  const handCards = Array.from(owner.hand).map((c) => c.instanceId);
  if (handCards.length === 0) return;

  // Cost: trash 1 card from hand.
  const trashChosen = await ctx.ask.selectCards(ctx, {
    candidates: handCards,
    min: 0,
    max: 1,
  });
  if (trashChosen.length === 0) return;
  await ctx.fx.trash(trashChosen);

  // Then choose 1 of your Digimon on the battle area.
  const myDigimon = Array.from(owner.battleArea)
    .filter((p) => {
      if (p.topCard === undefined) return false;
      return (ctx.game.definitionOf(p.topCard).kinds as string[]).includes("Digimon");
    })
    .map((p) => p.permanentId);

  if (myDigimon.length === 0) return;

  const targetIds =
    myDigimon.length === 1
      ? [myDigimon[0]!]
      : await ctx.ask.chooseTargets(ctx, { candidates: myDigimon, min: 1, max: 1 });

  for (const id of targetIds) {
    ctx.fx.grantKeyword(id, "Raid", EffectDuration.UntilEachTurnEnd);
    ctx.fx.modifyDP(id, 3000, EffectDuration.UntilEachTurnEnd);
  }
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play]: trash 1 hand card → 1 of your Digimon gains Raid and +3000 DP for the turn.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-raid`,
          description:
            "[On Play] By trashing 1 card in your hand, for the turn, 1 of your Digimon " +
            "gains ＜Raid＞ and gets +3000 DP.",
          optional: true,
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            return ctx.game.player(ctx.source.ownerSeat).hand.length > 0;
          },
          resolve: trashHandAndGrantRaid,
        }),
      ];
    }

    // [When Digivolving]: same effect.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-raid`,
          description:
            "[When Digivolving] By trashing 1 card in your hand, for the turn, 1 of your Digimon " +
            "gains ＜Raid＞ and gets +3000 DP.",
          optional: true,
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            return ctx.game.player(ctx.source.ownerSeat).hand.length > 0;
          },
          resolve: trashHandAndGrantRaid,
        }),
      ];
    }

    // [Your Turn] [Inherited] This Digimon with the SoC/SEEKERS trait doesn't activate
    // [Security] effects on Option cards it checks.
    // Implemented as a static modifier: each pass, if the top card has SoC/SEEKERS,
    // re-grant disableSecurityEffect for Options on this permanent as attacker.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/ess-disable-security-option`,
          description:
            "[Your Turn][Inherited] This Digimon with the [SoC]/[SEEKERS] trait doesn't " +
            "activate [Security] effects on Option cards it checks.",
          isInherited: true,
          when: (ctx) => {
            const perm = ctx.source.permanent();
            if (perm === undefined || perm.topCard === undefined) return false;
            const def = ctx.game.definitionOf(perm.topCard);
            return hasSocOrSeekersTrait(def);
          },
          resolve: async (ctx) => {
            const perm = ctx.source.permanent();
            if (perm === undefined || perm.topCard === undefined) return;
            const def = ctx.game.definitionOf(perm.topCard);
            if (!hasSocOrSeekersTrait(def)) return;
            ctx.fx.disableSecurityEffect(
              perm.permanentId,
              "option",
              EffectDuration.UntilEachTurnEnd,
            );
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/delete-on-tamer-placed`,
          description:
            "[All Turns] When a Tamer card is placed in this Digimon's digivolution cards, delete 1 of your opponent's Digimon with 6000 DP or less.",
          isInherited: false,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const host = ctx.source.permanent();
            if (host === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "onAddDigivolutionCards",
              sourcePermanentId: host.permanentId,
              once: false,
              description: `${cardId}: delete an opposing Digimon with 6000 DP or less when a Tamer is placed under this Digimon`,
              matches: (subCtx) => {
                if (subCtx.trigger.subjectPermanentId !== host.permanentId) return false;
                const addedIds = subCtx.trigger.addedDigivolutionCardInstanceIds ?? [];
                return addedIds.some((instanceId) => {
                  const card = subCtx.game.permanentById(host.permanentId)?.stack.find((c) => c.instanceId === instanceId);
                  return card !== undefined && subCtx.game.definitionOf(card).kinds?.includes(CardKind.Tamer);
                });
              },
              run: async (subCtx) => {
                const opponent = subCtx.game.player(subCtx.game.opponentOf(source.ownerSeat));
                const candidates = Array.from(opponent.battleArea)
                  .filter((p) => {
                    if (p.topCard === undefined) return false;
                    const def = subCtx.game.definitionOf(p.topCard);
                    return isDigimon(def) && (def.dp ?? 0) <= 6000;
                  })
                  .map((p) => p.permanentId);
                if (candidates.length === 0) return;
                const chosen =
                  candidates.length === 1
                    ? candidates
                    : await subCtx.ask.chooseTargets(subCtx, { candidates, min: 1, max: 1 });
                if (chosen.length > 0) await subCtx.fx.deletePermanent([chosen[0]!]);
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
