import { CardKind, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, whenDigivolving, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT21-058";

function hasVemmonInText(def: CardDefinition): boolean {
  // "Vemmon in its text" includes the card's printed effect text, not only its
  // name or trait list.  BT11-065 (Snatchmon), for example, qualifies because
  // its [When Digivolving] text mentions [Vemmon] while its name and types do not.
  const printedText = [
    def.nameEn,
    def.effectText,
    def.inheritedEffectText,
    def.securityEffectText,
    ...(def.forms ?? []),
    ...(def.attributes ?? []),
    ...(def.types ?? []),
  ];
  return printedText.some((text) => text?.includes("Vemmon") === true);
}

function isVemmon(def: CardDefinition): boolean {
  return def.nameEn === "Vemmon";
}

/** Shared resolve body for the OnPlay + WhenDigivolving clauses. */
async function revealAndPlaceVemmon(ctx: EffectContext, source: CardSource): Promise<void> {
  const owner = ctx.game.player(source.ownerSeat);

  // Reveal top 3 cards of deck.
  const deckTop = owner.deck.slice(0, 3);
  if (deckTop.length === 0) return;
  const revealedIds = deckTop.map((c) => c.instanceId);

  // From the revealed cards, add up to 1 with [Vemmon] in text to hand; trash the rest.
  const withVemmon = revealedIds.filter((id) => {
    const inst = owner.deck.find((c) => c.instanceId === id);
    if (!inst) return false;
    return hasVemmonInText(ctx.game.definitionOf(inst));
  });

  const toHand = withVemmon.slice(0, 1);
  const toTrash = revealedIds.filter((id) => !toHand.includes(id));

  // Move top 3 from deck first (reveal is informational; we move them).
  if (toHand.length > 0) {
    await ctx.fx.returnToHand(toHand);
  }
  if (toTrash.length > 0) {
    await ctx.fx.trash(toTrash);
  }

  // Then, you may place up to 2 [Vemmon] from your trash as 1 of your Digimon's bottom digi-cards.
  const vemmonInTrash = owner.trash
    .filter((c) => isVemmon(ctx.game.definitionOf(c)))
    .map((c) => c.instanceId);

  if (vemmonInTrash.length === 0) return;

  const maxPlace = Math.min(2, vemmonInTrash.length);
  const chosen = await ctx.ask.selectCards(ctx, {
    candidates: vemmonInTrash,
    min: 0,
    max: maxPlace,
  });
  if (chosen.length === 0) return;

  // Pick a target Digimon permanent to place them under.
  const ownDigimon = owner.battleArea
    .filter((p) => !p.inBreeding && p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
    .map((p) => p.permanentId);

  if (ownDigimon.length === 0) return;

  const targetPermanentId =
    ownDigimon.length === 1
      ? ownDigimon[0]!
      : (await ctx.ask.chooseTargets(ctx, { candidates: ownDigimon, min: 1, max: 1 }))[0];

  if (targetPermanentId === undefined) return;
  await ctx.fx.placeUnder(targetPermanentId, chosen);
}

/** Install an [All Turns][Once Per Turn][Inherited] watcher: when Vemmon returned to deck from
 *  digivolution cards, delete 1 opponent Digimon with play cost 4 or less.
 *  Anchored on the host permanent (the Digimon that has Snatchmon in its stack). */
function installVemmonReturnWatcher(ctx: EffectContext, hostPermanentId: string): void {
  ctx.fx.subscribeSubTrigger({
    event: "onDigivolutionCardReturnToDeckBottom",
    sourcePermanentId: hostPermanentId,
    once: false,
    description:
      "BT21-058 [All Turns][OPT][Inherited]: When [Vemmon] returned to deck from digivolution, " +
      "delete 1 opponent Digimon with play cost 4 or less.",
    matches: (subCtx) => {
      // Gate: returned card must be named "Vemmon" and the event host must match.
      const subjectId = subCtx.trigger.subjectPermanentId;
      if (subjectId !== hostPermanentId) return false;
      const returnedCardId = subCtx.trigger.returnedToDeckCardId;
      if (returnedCardId === undefined) return false;
      // returnedToDeckCardId is the CardInstance.cardId (e.g. "BT21-056").
      // Find the card in the owner's deck to check its definition.
      const ownerSeat = subCtx.source.ownerSeat;
      const owner = subCtx.game.player(ownerSeat);
      const returned = owner.deck.find((c) => c.cardId === returnedCardId);
      if (returned === undefined) {
        // Fallback: hardcoded known Vemmon cardIds (BT11-061, BT18-060, BT21-056).
        return ["BT11-061", "BT18-060", "BT21-056"].includes(returnedCardId);
      }
      return isVemmon(subCtx.game.definitionOf(returned));
    },
    run: async (subCtx) => {
      // Delete 1 opponent Digimon with play cost 4 or less.
      const opponentSeat = subCtx.game.opponentOf(subCtx.source.ownerSeat);
      const candidates = subCtx.game
        .player(opponentSeat)
        .battleArea.filter((p) => {
          if (p.inBreeding || p.topCard === undefined) return false;
          const def = subCtx.game.definitionOf(p.topCard);
          if (!(def.kinds as string[]).includes(CardKind.Digimon as string)) return false;
          return def.playCost !== undefined && def.playCost <= 4;
        })
        .map((p) => p.permanentId);

      if (candidates.length === 0) return;

      const target =
        candidates.length === 1
          ? candidates[0]!
          : (await subCtx.ask.chooseTargets(subCtx, { candidates, min: 1, max: 1 }))[0];

      if (target !== undefined) {
        await subCtx.fx.deletePermanent([target]);
      }
    },
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] Reveal 3, add 1 Vemmon-in-text to hand, trash rest; then place up to 2
    // Vemmon from trash under 1 of your Digimon. (documented behavior)
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-reveal-place-vemmon`,
          description:
            "[On Play] Reveal the top 3 cards of your deck. Add 1 card with [Vemmon] in its text " +
            "to your hand. Trash the rest. Then, you may place up to 2 [Vemmon] from your trash " +
            "as 1 of your Digimon's bottom digivolution cards.",
          resolve: (ctx) => revealAndPlaceVemmon(ctx, source),
        }),
      ];
    }

    // [When Digivolving] Same effect. (documented behavior)
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-reveal-place-vemmon`,
          description:
            "[When Digivolving] Reveal the top 3 cards of your deck. Add 1 card with [Vemmon] in " +
            "its text to your hand. Trash the rest. Then, you may place up to 2 [Vemmon] from your " +
            "trash as 1 of your Digimon's bottom digivolution cards.",
          resolve: (ctx) => revealAndPlaceVemmon(ctx, source),
        }),
      ];
    }

    // [All Turns][Once Per Turn][Inherited] When Vemmon is returned to deck from digivolution
    // cards, delete 1 opponent Digimon with play cost 4 or less.
    // The inherited effect fires at OnEnterFieldAnyone for the HOST Digimon (the permanent
    // that has Snatchmon in its stack). We install the sub-trigger watcher at this time.
    // (documented behavior)
    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/inherited-install-vemmon-return-watcher`,
          description:
            "[All Turns][Inherited] Install watcher: when [Vemmon] returned to deck from " +
            "digivolution cards, delete 1 opponent Digimon with play cost 4 or less.",
          isInherited: true,
          maxPerTurn: 1,
          when: (ctx) => {
            // Only fire when the entering permanent is the one hosting this Snatchmon.
            const subjectId = ctx.trigger.subjectPermanentId;
            if (subjectId === undefined) return false;
            // We must be in that permanent's digivolution stack.
            const host = ctx.game.permanentById(subjectId);
            if (host === undefined) return false;
            return host.stack.some((c) => c.instanceId === source.instanceId);
          },
          canActivate: () => true,
          resolve: async (ctx) => {
            const subjectId = ctx.trigger.subjectPermanentId;
            if (subjectId === undefined) return;
            installVemmonReturnWatcher(ctx, subjectId);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
