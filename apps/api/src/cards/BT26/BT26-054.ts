import { CardKind, EffectTiming } from "@aegis/shared";
import type { CardDefinition, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, staticModifier, whenAttacking, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-054 — Andromon (BT26, Black/Yellow Lv.5 Digimon, Cyborg/CS).
//
// The committed KB has no card-specific ruling or erratum for BT26-054; behavior follows
// every printed clause.
//
// [Digivolve] Lv.4 w/[CS] trait: Cost 3 — a digivolution-cost requirement, not an effect
//   clause; carried by the generated alternate digivolution requirements.
// [On Play] [When Digivolving] You may play 1 [CS] trait Tamer card from your hand without
//   paying the cost. This effect can't play cards with the same name as any of your Tamers.
// [All Turns] [Once Per Turn] When effects place [CS] trait Digimon cards in this Digimon's
//   digivolution cards, this Digimon may digivolve into a [CS] trait Digimon card in the hand
//   without paying the cost.
//
// Clause 1: one resolver over the two printed windows (BT26-025's idiom). The trailing
//   sentence is a candidate filter, not a separate effect — a hand Tamer sharing a name with
//   any Tamer the controller already has on the battle area is excluded before the prompt,
//   so "you may play 1" can never offer an illegal choice. `playFromHand` defaults to no cost.
// Clause 2: the BT26-001/BT26-044 reactive alternate-digivolve idiom — a `staticModifier`
//   installing an `onAddDigivolutionCards` watcher (EX7-005's precedent, including the
//   explicit `oncePerTurnKey`: a persistent effect's `maxPerTurn` is not itself the engine's
//   per-turn gate for the watcher it installs). `[All Turns]` means no `isOwnersTurn` gate.
//   `trigger.addedDigivolutionCardInstanceIds` names exactly the cards just placed, so the
//   watcher fires only for a placement that actually included a [CS] trait Digimon card.

const cardId = "BT26-054";
const CS_TRAIT = "CS";

const isDigimon = (def: CardDefinition): boolean => def.kinds?.includes(CardKind.Digimon) === true;
const isTamer = (def: CardDefinition): boolean => def.kinds?.includes(CardKind.Tamer) === true;
const hasCsTrait = (def: CardDefinition): boolean => (def.types ?? []).includes(CS_TRAIT);

/** Names of the Tamers this player already controls — the clause's own exclusion list. */
function ownTamerNames(ctx: EffectContext, ownerSeat: Seat): Set<string> {
  const names = new Set<string>();
  for (const permanent of ctx.game.player(ownerSeat).battleArea) {
    if (permanent.topCard === undefined) continue;
    const def = ctx.game.definitionOf(permanent.topCard);
    if (isTamer(def)) names.add(def.nameEn);
  }
  return names;
}

function playableCsTamers(ctx: EffectContext, ownerSeat: Seat): string[] {
  const excluded = ownTamerNames(ctx, ownerSeat);
  return Array.from(ctx.game.player(ownerSeat).hand)
    .filter((card) => {
      const def = ctx.game.definitionOf(card);
      return isTamer(def) && hasCsTrait(def) && !excluded.has(def.nameEn);
    })
    .map((card) => card.instanceId);
}

/**
 * "You may play 1 [CS] trait Tamer card from your hand without paying the cost. This effect
 * can't play cards with the same name as any of your Tamers."
 */
async function playCsTamerFromHand(ctx: EffectContext, source: CardSource): Promise<void> {
  const candidates = playableCsTamers(ctx, source.ownerSeat);
  if (candidates.length === 0) return;

  const chosen = await ctx.ask.selectCards(ctx, { candidates, min: 1, max: 1 });
  if (chosen.length === 0) return;

  await ctx.fx.playFromHand(chosen, { payCost: false });
}

function csDigimonHandCandidates(ctx: EffectContext, ownerSeat: Seat): string[] {
  return Array.from(ctx.game.player(ownerSeat).hand)
    .filter((card) => {
      const def = ctx.game.definitionOf(card);
      return isDigimon(def) && hasCsTrait(def);
    })
    .map((card) => card.instanceId);
}

/**
 * "This Digimon may digivolve into a [CS] trait Digimon card in the hand without paying the
 * cost."
 */
async function resolveMayDigivolveIntoCsDigimon(
  ctx: EffectContext,
  selfPermanentId: string,
  ownerSeat: Seat,
): Promise<void> {
  const self = ctx.game.permanentById(selfPermanentId);
  if (self === undefined || self.inBreeding) return;

  const candidates = csDigimonHandCandidates(ctx, ownerSeat);
  if (candidates.length === 0) {
    ctx.oncePerTurnActivationDeclined = true;
    return;
  }

  const wantToActivate = await ctx.ask.optional(
    ctx,
    "Digivolve this Digimon into a [CS] trait Digimon card in the hand without paying the cost?",
  );
  if (!wantToActivate) {
    ctx.oncePerTurnActivationDeclined = true;
    return;
  }

  const chosen = await ctx.ask.selectCards(ctx, { candidates, min: 1, max: 1 });
  if (chosen.length === 0) {
    ctx.oncePerTurnActivationDeclined = true;
    return;
  }

  await ctx.fx.digivolveFromInstance(selfPermanentId, chosen[0]!, { ignoreRequirements: true });
}

const PLAY_TAMER_CLAUSE =
  "You may play 1 [CS] trait Tamer card from your hand without paying the cost. This effect " +
  "can't play cards with the same name as any of your Tamers.";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-play-cs-tamer`,
          description: `[On Play] ${PLAY_TAMER_CLAUSE}`,
          optional: true,
          canActivate: (ctx) => playableCsTamers(ctx, source.ownerSeat).length > 0,
          resolve: async (ctx) => {
            await playCsTamerFromHand(ctx, source);
          },
        }),
      ];
    }

    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-play-cs-tamer`,
          description: `[When Digivolving] ${PLAY_TAMER_CLAUSE}`,
          optional: true,
          canActivate: (ctx) => playableCsTamers(ctx, source.ownerSeat).length > 0,
          resolve: async (ctx) => {
            await playCsTamerFromHand(ctx, source);
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/reactive-alt-digivolve-on-cs-stack-add`,
          description:
            "[All Turns] [Once Per Turn] When effects place [CS] trait Digimon cards in this " +
            "Digimon's digivolution cards, this Digimon may digivolve into a [CS] trait Digimon " +
            "card in the hand without paying the cost.",
          maxPerTurn: 1,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            const selfPermanentId = self.permanentId;
            const ownerSeat = source.ownerSeat;

            ctx.fx.subscribeSubTrigger({
              event: "onAddDigivolutionCards",
              sourcePermanentId: selfPermanentId,
              once: false,
              oncePerTiming: true,
              description: `${cardId}: [CS] Digimon cards placed in this Digimon's stack -> may alt-digivolve.`,
              matches: (subCtx) => {
                if (!subCtx.source.isOnBattleArea()) return false;
                if (subCtx.trigger?.subjectPermanentId !== selfPermanentId) return false;
                const added = subCtx.trigger?.addedDigivolutionCardInstanceIds ?? [];
                if (added.length === 0) return false;
                const permanent = subCtx.game.permanentById(selfPermanentId);
                if (permanent === undefined) return false;
                return permanent.stack.some((card) => {
                  if (!added.includes(card.instanceId)) return false;
                  const def = subCtx.game.definitionOf(card);
                  return isDigimon(def) && hasCsTrait(def);
                });
              },
              run: async (subCtx) => {
                await resolveMayDigivolveIntoCsDigimon(subCtx, selfPermanentId, ownerSeat);
              },
            });
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/inherited-opponent-attack-redirect-self`,
          description:
            "[Opponent's Turn] [Once Per Turn] When one of your opponent's Digimon " +
            "attacks, you may change the attack target to this Digimon.",
          isInherited: true,
          attackScope: "opponent",
          optional: true,
          maxPerTurn: 1,
          when: (ctx) => {
            if (!ctx.source.isOnBattleArea() || ctx.source.isOwnersTurn()) return false;
            const attackerId = ctx.trigger.attackerPermanentId;
            const attacker = attackerId === undefined ? undefined : ctx.game.permanentById(attackerId);
            return attacker !== undefined && attacker.controllerSeat !== source.ownerSeat;
          },
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self !== undefined) await ctx.fx.redirectAttack([self.permanentId], { optional: true });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
