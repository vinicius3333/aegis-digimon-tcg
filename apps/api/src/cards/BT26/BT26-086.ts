import { CardKind, EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardDefinition, CardInstance, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { cardHasTrait } from "../../engine/cards/cardData.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-086 — Dantemon (BT26, White Lv.7 Digimon, Appmon).
//
// Provisional port: no KB entry (errata/Q&A) exists yet for BT26-086 as of this port
// (`node tools/kb/query.mjs card BT26-086` returned no knowledge-base entries). Implemented
// from the printed card text only.
//
// [Assembly -7] 7 [Seven Code] trait Digimon cards w/different names
// ＜Rush＞ ＜Reboot＞ ＜Blocker＞ — printed keywords, auto-parsed from effectText by
//   combat/keywords.ts; no module clause (BT26-013's convention).
// ＜Link +6＞ — NOT a printed-text keyword the combat scanner reads: the effective link limit
//   comes from the continuous ledger (`GameAccess.linkMax`), so it needs a real grant
//   (EX11-073's `grantLinkMax` static precedent).
// [On Play] [When Digivolving] You may link up to 7 [Appmon] trait cards with different names
//   from this Digimon's digivolution cards to this Digimon without paying the costs. Then,
//   this Digimon may attack without suspending.
// [All Turns] [Once Per Turn] When this Digimon gets linked, you may delete 1 of your
//   opponent's Digimon. Then, if this Digimon has 7 link cards, return your opponent's top
//   security card to the bottom of the deck.
//
// The [Assembly -7] recipe is supplied by the shared hand-authored
// `ASSEMBLY_REQUIREMENT_OVERRIDES` table because BT26's effect modules are hand-written.
//
// "with different names" is enforced after selection by retaining only the first selected
// printing of each name. All printings remain selectable because same-named cards can carry
// different inherited/link text; hiding one would incorrectly remove a meaningful choice.
// "may attack without suspending" is `forceAttack(self, { withoutSuspending: true })`,
//   BT12-083's mapping of the same printed phrase.
// The `whenLinked` watcher gates on `trigger.subjectPermanentId`: the engine fires that event
//   board-wide (primitives.ts's `link`), so the permanent anchor alone does not scope it.

const cardId = "BT26-086";
const APPMON_TRAIT = "Appmon";
const MAX_LINKS = 7;
const LINK_BONUS = 6;
const SECURITY_RETURN_LINK_COUNT = 7;

const isDigimon = (def: CardDefinition): boolean => def.kinds?.includes(CardKind.Digimon) === true;

function appmonStackCandidates(ctx: EffectContext, stack: readonly CardInstance[]): string[] {
  return stack
    .filter((card) => cardHasTrait(ctx.game.definitionOf(card), APPMON_TRAIT))
    .map((card) => card.instanceId);
}

function distinctNamesFromSelection(ctx: EffectContext, stack: readonly CardInstance[], selected: string[]): string[] {
  const byId = new Map(stack.map((card) => [card.instanceId, card]));
  const seenNames = new Set<string>();
  return selected.filter((instanceId) => {
    const card = byId.get(instanceId);
    if (card === undefined) return false;
    const name = ctx.game.definitionOf(card).nameEn;
    if (seenNames.has(name)) return false;
    seenNames.add(name);
    return true;
  });
}

function opponentDigimon(ctx: EffectContext, ownerSeat: Seat): string[] {
  const opponentSeat = ctx.game.opponentOf(ownerSeat);
  return Array.from(ctx.game.player(opponentSeat).battleArea)
    .filter(
      (permanent) =>
        !permanent.inBreeding && permanent.topCard !== undefined && isDigimon(ctx.game.definitionOf(permanent.topCard)),
    )
    .map((permanent) => permanent.permanentId);
}

/**
 * "You may link up to 7 [Appmon] trait cards with different names from this Digimon's
 * digivolution cards to this Digimon without paying the costs. Then, this Digimon may attack
 * without suspending." — shared by the [On Play] and [When Digivolving] windows.
 */
async function linkAppmonStackCardsThenAttack(ctx: EffectContext): Promise<void> {
  const anchor = ctx.source.permanent();
  if (anchor === undefined) return;
  // Read the LIVE permanent for its stack: `ctx.source.permanent()` is the effect's anchor,
  // and the digivolution stack may have changed since the window opened.
  const self = ctx.game.permanentById(anchor.permanentId);
  if (self === undefined) return;

  const candidates = appmonStackCandidates(ctx, self.stack);
  if (candidates.length > 0) {
    const chosen = await ctx.ask.selectCards(ctx, { candidates, min: 0, max: MAX_LINKS });
    const legalChosen = distinctNamesFromSelection(ctx, self.stack, chosen).slice(0, MAX_LINKS);
    if (legalChosen.length > 0) await ctx.fx.link(self.permanentId, legalChosen);
  }

  const wantToAttack = await ctx.ask.optional(ctx, "Attack with this Digimon without suspending it?");
  if (!wantToAttack) return;

  await ctx.fx.forceAttack(self.permanentId, { withoutSuspending: true });
}

const LINK_CLAUSE =
  "You may link up to 7 [Appmon] trait cards with different names from this Digimon's " +
  "digivolution cards to this Digimon without paying the costs. Then, this Digimon may attack " +
  "without suspending.";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/link-appmon-stack-then-attack`,
          description: `[On Play] ${LINK_CLAUSE}`,
          optional: true,
          resolve: linkAppmonStackCardsThenAttack,
        }),
      ];
    }

    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/link-appmon-stack-then-attack`,
          description: `[When Digivolving] ${LINK_CLAUSE}`,
          optional: true,
          resolve: linkAppmonStackCardsThenAttack,
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/link-max-bonus`,
          description: "＜Link +6＞",
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            ctx.fx.grantLinkMax(self.permanentId, LINK_BONUS, EffectDuration.UntilEachTurnEnd);
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/when-linked-delete-then-return-security`,
          description:
            "[All Turns] [Once Per Turn] When this Digimon gets linked, you may delete 1 of " +
            "your opponent's Digimon. Then, if this Digimon has 7 link cards, return your " +
            "opponent's top security card to the bottom of the deck.",
          maxPerTurn: 1,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            const selfId = self.permanentId;
            const ownerSeat = source.ownerSeat;

            ctx.fx.subscribeSubTrigger({
              event: "whenLinked",
              sourcePermanentId: selfId,
              once: false,
              oncePerTurnKey: `${cardId}/when-linked-delete-then-return-security`,
              description: `${cardId}: this Digimon gets linked -> may delete, then maybe mill a security card.`,
              matches: (subCtx) => {
                if (!subCtx.source.isOnBattleArea()) return false;
                return subCtx.trigger?.subjectPermanentId === selfId;
              },
              run: async (subCtx) => {
                const targets = opponentDigimon(subCtx, ownerSeat);
                if (targets.length > 0) {
                  const chosen = await subCtx.ask.chooseTargets(subCtx, { candidates: targets, min: 0, max: 1 });
                  if (chosen.length > 0) await subCtx.fx.deletePermanent(chosen);
                }

                const current = subCtx.game.permanentById(selfId);
                if (current === undefined || current.linked.length < SECURITY_RETURN_LINK_COUNT) return;

                const opponentSecurity = subCtx.game.player(subCtx.game.opponentOf(ownerSeat)).security;
                const topSecurity = opponentSecurity[0];
                if (topSecurity === undefined) return;

                await subCtx.fx.returnToDeck([topSecurity.instanceId], { toTop: false });
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
