import { CardKind, EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, staticModifier, whenAttacking, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// Hand-written module for BT23-021 (Dosukomon). source:
//
// Semantic fix vs the declarative effect record:
//   and [When Attacking] Link effects, enforcing a single once-per-turn counter for
//   both. The IR generator assigns per-timing effectKeys, giving each its own OPT
//   counter and allowing two links per turn (one per timing). This module uses the
//   same effectKey for both so the kernel's UseTracker counts them together.
//
// Engine gaps (not fixable in a card file):
//   - The `digivolutionCards` zone source collects from ALL friendly permanents'
//     digivolution cards). Fixing this requires a zone-scope field in the shared IR.
//   - The Link filter cannot enforce <Link> capability (no hasLinkRequirement field
//     in Filter). Q5241 (2025-10-03) confirms only cards with <Link> may link;
//     in practice all Appmon Lv.3 Digimon carry <Link>, so the gap is benign here.
//
// Structural metadata (app fusion, alt digivolution, link requirement) is carried
//
//     → handled by the linkRequirement / digivolutionRequirement structural fields
//     → handled by the linkRequirement structural field
//   EffectTiming.None (rule implementation: Dokamon/Perorimon/Musclemon, cost 0)
//     → handled by the appFusionRequirement structural field
//   EffectTiming.OnDeclaration (the effect factory.LinkEffect)
//     → [Main] activated with empty body (link button — no resolved action)
//   EffectTiming.OnEnterFieldAnyone (link 1 Lv.3 Digimon, OPT, hash BT23_021_WD/WA)
//     → WhenDigivolving, shared effectKey "BT23-021/link-wd-wa", maxPerTurn 1
//   EffectTiming.OnAllyAttack (link 1 Lv.3 Digimon, OPT, hash BT23_021_WD/WA)
//     → WhenAttacking, shared effectKey "BT23-021/link-wd-wa", maxPerTurn 1
//   EffectTiming.WhenLinked, IsOwnerTurn (can't be deleted in battle, OPT, hash BT23_021_WL)
//     → Static (None), install SubTrigger whenLinked — YourTurn guard
//   EffectTiming.WhenLinked, IsLinkedEffect (can't be deleted in battle)
//     → Static (None), install SubTrigger whenLinked — isLinked

const cardId = "BT23-021";

const linkOptKey = `${cardId}/link-wd-wa`;

const linkDescription =
  "[When Digivolving][When Attacking][Once Per Turn] You may link 1 level 3 Digimon card " +
  "from your hand or this Digimon's digivolution cards to 1 of your Digimon without paying the cost.";

/** Execute the shared Link body: pick 1 Lv.3 Digimon from hand or self's digivolution cards. */
async function resolveLink(ctx: EffectContext, source: CardSource): Promise<void> {
  const self = source.permanent();
  if (self === undefined) return;

  const ownerSeat = source.ownerSeat;

  // Candidates from hand: level 3 Digimon.
  const handCards = Array.from(ctx.game.player(ownerSeat).hand);
  const handCandidates = handCards
    .filter((c) => {
      const def = ctx.game.definitionOf(c);
      return def.kinds.includes(CardKind.Digimon) && def.level === 3;
    })
    .map((c) => c.instanceId);

  // Candidates from this Digimon's digivolution stack.
  const stackCards = Array.from(self.stack);
  const stackCandidates = stackCards
    .filter((c) => {
      const def = ctx.game.definitionOf(c);
      return def.kinds.includes(CardKind.Digimon) && def.level === 3;
    })
    .map((c) => c.instanceId);

  const allCandidates = [...handCandidates, ...stackCandidates];
  if (allCandidates.length === 0) return;

  const chosen = await ctx.ask.selectCards(ctx, {
    candidates: allCandidates,
    min: 0,
    max: 1,
  });
  if (chosen.length === 0) return;

  // Link the chosen card to this Digimon at no cost (effect-granted free link).
  ctx.fx.link(self.permanentId, chosen);
}

/** Grant "can't be deleted in battle until opponent's turn ends" to the source permanent. */
async function applyCannotBeDeletedInBattle(ctx: EffectContext, source: CardSource): Promise<void> {
  const self = source.permanent();
  if (self === undefined) return;
  ctx.fx.restrict(self.permanentId, "beDeletedInBattle", EffectDuration.UntilOpponentTurnEnd);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // the effect factory.LinkEffect(card). Structural legality is enforced by linkRequirement.
    if (timing === EffectTiming.OnDeclaration) {
      return [
        activated({
          source,
          effectKey: `${cardId}/link-declaration`,
          description: "[Main] Link a card to this Digimon.",
          optional: false,
          resolve: async (_ctx) => {
            // Link button — legality is gated by the linkRequirement structural field.
            // The payment and execution are handled by the link-play path, not here.
          },
        }),
      ];
    }

    // [When Digivolving][Once Per Turn] — shares OPT counter with [When Attacking].
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: linkOptKey,
          description: linkDescription,
          optional: true,
          maxPerTurn: 1,
          when: () => source.isOnBattleArea(),
          resolve: async (ctx) => {
            await resolveLink(ctx, source);
          },
        }),
      ];
    }

    // [When Attacking][Once Per Turn] — shares the OPT counter with [When Digivolving].
    // Uses OnUseAttack: the engine fires this timing for "WhenAttacking" IR effects
    // (timingForTrigger maps "WhenAttacking" -> OnUseAttack; see interpreter.ts).
    if (timing === EffectTiming.OnUseAttack) {
      return [
        whenAttacking({
          source,
          effectKey: linkOptKey,
          description: linkDescription,
          optional: true,
          maxPerTurn: 1,
          when: () => source.isOnBattleArea(),
          resolve: async (ctx) => {
            await resolveLink(ctx, source);
          },
        }),
      ];
    }

    // Static window: install SubTrigger subscriptions via EffectTiming.None.
    if (timing === EffectTiming.None) {
      return [
        // [Your Turn][Once Per Turn] When this Digimon gets linked, it can't be deleted
        // in battle until your opponent's turn ends.
        staticModifier({
          source,
          effectKey: `${cardId}/when-linked-battle-immunity-yt`,
          description:
            "[Your Turn][Once Per Turn] When this Digimon gets linked, it can't be deleted in battle until your opponent's turn ends.",
          maxPerTurn: 1,
          when: () => source.isOnBattleArea() && source.isOwnersTurn(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenLinked",
              sourcePermanentId: self.permanentId,
              once: false,
              oncePerTurnKey: `${cardId}/when-linked-battle-immunity-yt`,
              description:
                "[Your Turn][Once Per Turn] When this Digimon gets linked, it can't be deleted in battle until your opponent's turn ends.",
              run: async (subCtx) => {
                await applyCannotBeDeletedInBattle(subCtx, source);
              },
            });
          },
        }),

        // [When Linking] This Digimon can't be deleted in battle until your opponent's
        // turn ends.
        staticModifier({
          source,
          effectKey: `${cardId}/when-linking-battle-immunity`,
          description:
            "[When Linking] This Digimon can't be deleted in battle until your opponent's turn ends.",
          isLinked: true,
          when: () => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenLinked",
              sourcePermanentId: self.permanentId,
              once: false,
              description:
                "[When Linking] This Digimon can't be deleted in battle until your opponent's turn ends.",
              run: async (subCtx) => {
                await applyCannotBeDeletedInBattle(subCtx, source);
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
