import { CardColor, EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// Lilithmon — EX10-058 (Purple Lv.6 Digimon).
//
// Hand-written override of the declarative effect record. The AUTO-GENERATED stub was WRONG and
// non-executable: it encoded the [On Play]/[When Digivolving] grant clause as a
// literal "select an opponent Digimon, then delete 1 of YOUR Digimon" (misreading
// "give 1 of their Digimon ... \"[End] Delete 1 of your Digimon\"" as an immediate
// self-delete), dropped the [All Turns] clause to empty effect blocks, and reduced the
// [DigiXros] requirement to a bare freeform desc. Removing the AUTO-GENERATED header
// preserves this file across regeneration (card-module contract + the file-header
// convention). Sibling of EX10-055 (Tactimon) — same Purple Lv.6 [Bagra Army] DigiXros
// archetype; this file mirrors that one's structure.
//
// Printed `effectText` (cards.json) is authoritative here (KB reports NO errata):
//   "[On Play] [When Digivolving] Until your opponent's turn ends, give 1 of their
//    Digimon or Tamers \"[End of Your Turn] Delete 1 of your Digimon.\""
//   "[All Turns] [Once Per Turn] When any of your opponent's Digimon are played or
//    deleted, by trashing any 2 of this Digimon's digivolution cards, you may play 1
//    level 4 or lower purple Digimon card from your trash without paying the cost."
//   "[DigiXros -2] 2 Digimon cards w/[Bagra Army] trait"
//
// KB (authoritative — `node tools/kb/query.mjs card EX10-058`): no errata. Bound Q&A:
//   - Q5158: the granted "[End of Your Turn] Delete 1 of your Digimon" CAN be given to
//     a Digimon that can't be affected, but if the recipient isn't affected at the
//     trigger timing the granted effect won't trigger.
//   - Q5159: when given to an OPPONENT's Digimon the granted effect activates as the
//     OPPONENT'S OWN effect — the recipient's controller chooses which of their Digimon
//     to delete, and a recipient unaffected by this card's effects is still deleted (it
//     is the recipient's own effect by then). So the grant re-homes the triggered
//     ability's controller to the recipient.
//   - Q5157: the [All Turns] "by trashing any 2 of this Digimon's digivolution cards"
//     cost is ALL-OR-NOTHING — trashing only 1 does not satisfy the "by" condition.
//   - Q5160: a [Damemon] (EX10-044) trashed from the digivolution cards by the [All
//     Turns] cost then played from trash by the same effect cannot activate its
//     inherited effect (it leaves the trash before the pending activation resolves).
//   - Q5168: the [All Turns] trigger DOES fire off this card's own [On Play]/[When
//     Digivolving] deleting an opponent's Digimon (a deletion the source itself causes
//     still counts as "an opponent's Digimon deleted").
const cardId = "EX10-058";

// Opponent battle-area Digimon OR Tamer — the candidate set for the [On Play]/[When
// Digivolving] grant (source PermanentCondition: IsPermanentExistsOnOpponentBattleArea
// Digimon || ...Tamer).
const isOpponentDigimonOrTamer = (ctx: EffectContext, source: CardSource, permanent: Permanent): boolean => {
  const opponent = ctx.game.opponentOf(source.ownerSeat);
  if (permanent.controllerSeat !== opponent || permanent.topCard === undefined) return false;
  const def = ctx.game.definitionOf(permanent.topCard);
  return isDigimon(def) || isTamer(def);
};

const opponentDigimonsOrTamers = (ctx: EffectContext, source: CardSource): Permanent[] =>
  Array.from(ctx.game.player(ctx.game.opponentOf(source.ownerSeat)).battleArea).filter((permanent) =>
    isOpponentDigimonOrTamer(ctx, source, permanent),
  );

async function resolveAllTurnsEffect(ctx: EffectContext, source: CardSource): Promise<void> {
  const self = ctx.source.permanent();
  if (self === undefined || self.stack.length < 2) return;
  const chosen = await ctx.ask.selectCards(ctx, {
    candidates: self.stack.map((c) => c.instanceId),
    min: 2,
    max: 2,
  });
  if (chosen.length !== 2) return;
  await ctx.fx.trash(chosen);
  const eligible = ctx.game.player(source.ownerSeat).trash.filter((c) => {
    const def = ctx.game.definitionOf(c);
    return isDigimon(def) && def.colors.includes(CardColor.Purple) && def.level !== undefined && def.level <= 4;
  });
  if (eligible.length === 0) return;
  const picked = await ctx.ask.selectCards(ctx, {
    candidates: eligible.map((c) => c.instanceId),
    min: 0,
    max: 1,
  });
  if (picked.length > 0) await ctx.fx.playInstances(picked, { payCost: false });
}

function installAllTurnsWatcher(ctx: EffectContext, source: CardSource): void {
  const self = source.permanent();
  if (self === undefined) return;
  const opponent = ctx.game.opponentOf(source.ownerSeat);
  const oncePerTurnKey = `${cardId}/all-turns-trash-2-play-purple`;
  ctx.fx.subscribeSubTrigger({
    event: "whenPlayed",
    sourcePermanentId: self.permanentId,
    once: false,
    oncePerTurnKey,
    description: `${cardId}: opponent Digimon played`,
    matches: (subCtx) => {
      const id = subCtx.trigger?.subjectPermanentId;
      const permanent = id === undefined ? undefined : subCtx.game.permanentById(id);
      return (
        permanent !== undefined &&
        permanent.controllerSeat === opponent &&
        permanent.topCard !== undefined &&
        isDigimon(subCtx.game.definitionOf(permanent.topCard))
      );
    },
    run: async (subCtx) => {
      await resolveAllTurnsEffect(subCtx, source);
    },
  });
  ctx.fx.subscribeSubTrigger({
    event: "onDeletionOf",
    sourcePermanentId: self.permanentId,
    once: false,
    oncePerTurnKey,
    description: `${cardId}: opponent Digimon deleted`,
    matches: (subCtx) => {
      const id = subCtx.trigger?.deletedPermanentId;
      const permanent = id === undefined ? undefined : subCtx.game.permanentById(id);
      return (
        permanent !== undefined &&
        permanent.controllerSeat === opponent &&
        permanent.topCard !== undefined &&
        isDigimon(subCtx.game.definitionOf(permanent.topCard))
      );
    },
    run: async (subCtx) => {
      await resolveAllTurnsEffect(subCtx, source);
    },
  });
}

const grantDescription = (window: "On Play" | "When Digivolving"): string =>
  `[${window}] Until your opponent's turn ends, give 1 of their Digimon or Tamers ` +
  '"[End of Your Turn] Delete 1 of your Digimon."';

async function grantEndOfTurnSelfDelete(ctx: EffectContext, source: CardSource): Promise<void> {
  const candidates = opponentDigimonsOrTamers(ctx, source);
  if (candidates.length === 0) return;
  const byTopCard = new Map(candidates.map((permanent) => [permanent.topCard!.instanceId, permanent]));
  const chosenIds = await ctx.ask.chooseTargets(ctx, {
    candidates: Array.from(byTopCard.keys()),
    min: 1,
    max: 1,
  });
  const recipient = chosenIds[0] === undefined ? undefined : byTopCard.get(chosenIds[0]);
  if (recipient === undefined) return;

  const recipientSeat = recipient.controllerSeat;
  ctx.fx.subscribeSubTrigger({
    event: "endOfTurn",
    sourcePermanentId: recipient.permanentId,
    once: true,
    expiresOnTurnEndOf: recipientSeat,
    description: `${source.cardId}: grant "[End of Your Turn] Delete 1 of your Digimon"`,
    // The recipient must still be the SAME permanent, on the field, at their OWN turn end
    // (Q5158: an unaffected recipient still receives the grant, but this engine has no
    // "affected by effects" predicate to gate on — see the clause header caveat).
    matches: (subCtx) => subCtx.source.isOnBattleArea() && subCtx.game.state.turnSeat === recipientSeat,
    run: async (subCtx) => {
      // "Delete 1 of your Digimon" — activates as the RECIPIENT's OWN effect (Q5159): their
      // controller chooses which of THEIR Digimon to delete, not necessarily the recipient
      // itself.
      const owner = subCtx.game.player(recipientSeat);
      const ownDigimon = Array.from(owner.battleArea).filter(
        (permanent) => permanent.topCard !== undefined && isDigimon(subCtx.game.definitionOf(permanent.topCard)),
      );
      if (ownDigimon.length === 0) return;
      const byOwnTopCard = new Map(ownDigimon.map((permanent) => [permanent.topCard!.instanceId, permanent]));
      const pickedIds = await subCtx.ask.chooseTargets(subCtx, {
        candidates: Array.from(byOwnTopCard.keys()),
        min: 1,
        max: 1,
      });
      const picked = pickedIds[0] === undefined ? undefined : byOwnTopCard.get(pickedIds[0]);
      if (picked !== undefined) await subCtx.fx.deletePermanent([picked.permanentId]);
    },
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] Until your opponent's turn ends, give 1 of their Digimon or Tamers
    // "[End of Your Turn] Delete 1 of your Digimon."
    //
    //   maxCount = min(1, matches), mandatory) and adds an rule implementation to the chosen
    //   permanent's `UntilOwnerTurnEndEffects` that, at OnEndTurn, deletes 1 of THAT
    //   permanent's controller's Digimon. CreateDebuffEffect is applied for the UI.
    //
    // Implemented below: select 1 opponent Digimon/Tamer, then install an `endOfTurn` watcher
    // anchored on the CHOSEN permanent (not this Lilithmon) so it fires with the recipient as
    // `ctx.source` and prompts the recipient's OWN controller to pick which of their Digimon
    // to delete. `expiresOnTurnEndOf` is the recipient's controller's seat ("until your
    // opponent's turn ends"). Known simplification (Q5158): the engine has no "affected by
    // effects" immunity predicate, so a recipient that is normally unaffected by this card's
    // effects still receives (and fires) the grant — a narrow, rare edge case, not modeled.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-grant-end-delete`,
          description: grantDescription("On Play"),
          optional: false,
          canActivate: (ctx) => opponentDigimonsOrTamers(ctx, source).length > 0,
          resolve: async (ctx) => {
            installAllTurnsWatcher(ctx, source);
            await grantEndOfTurnSelfDelete(ctx, source);
          },
        }),
      ];
    }

    // [When Digivolving] (identical body to [On Play]). The window fires
    // (GameEngine.fireWhenDigivolving); see the [On Play] clause header for the
    // grant mechanism both share.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-grant-end-delete`,
          description: grantDescription("When Digivolving"),
          optional: false,
          canActivate: (ctx) => opponentDigimonsOrTamers(ctx, source).length > 0,
          resolve: async (ctx) => {
            installAllTurnsWatcher(ctx, source);
            await grantEndOfTurnSelfDelete(ctx, source);
          },
        }),
      ];
    }

    // [All Turns] [Once Per Turn] When any of your opponent's Digimon are played or
    // deleted, by trashing any 2 of this Digimon's digivolution cards, you may play 1
    // level 4 or lower purple Digimon card from your trash without paying the cost.
    //
    //   Deleted over opponent Digimon), maxCountPerTurn 1, requiring >= 2 digivolution
    //   cards to trash (all-or-nothing, Q5157), and on success optionally plays 1 purple
    //   level<=4 Digimon from trash without paying the cost.
    //
    // [DigiXros -2] 2 Digimon cards w/[Bagra Army] trait.
    //
    // No effect is returned for this clause because none is needed: a DigiXros is a
    // PLAY-TIME mechanic (material placement + cost reduction declared while playing the
    // card), not a card-effect-module behavior. It is handled entirely by the GENERIC
    // DigiXros play subsystem — GameEngine.handlePlayCard routes any `playCard` intent
    // carrying a `digiXros` declaration to `handleDigiXros` (GameEngine.ts), which runs
    // `validateDigiXros`/`applyDigiXros` (apps/api/src/engine/actions/digiXros.ts) against
    // this card's own compiled `digiXrosRequirement`
    // ({"materials":[{"traits":["Bagra Army"]}],"count":2}, effects.json, read generically
    // via `digiXrosRequirementFor`). No per-card wiring is possible or needed here.
    //
    // Verified in this session by driving the real engine end to end (settling test:
    // EX10-058.test.ts, "[DigiXros -2] 2 Digimon cards w/[Bagra Army] trait" — PASSES):
    // playing EX10-058 with 2 [Bagra Army]-trait materials (BT10-073, BT10-077) from hand
    // is accepted, charges printed cost (11) minus 2 materials * the requirement's
    // per-material reduction (2) = 7 memory (comprehensive rules §7-2-2-1: reduced "by the
    // amount shown ... for each card placed" — `node tools/kb/query.mjs rules "DigiXros
    // cost reduction"`), places both materials under the new permanent, and fires [On Play].

    return [];
  },
};

registerCard(module);
export default module;
