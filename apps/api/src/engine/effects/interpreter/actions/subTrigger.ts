// Arming a watcher that fires on a later game event.

import type { EffectContext, SubTriggerEventName } from "../../EffectContext.js";
import { evaluateCondition } from "../conditions.js";
import { canPayCost, payCost, payOneCostOption } from "../costs.js";
import { runAction } from "../dispatch.js";
import { unsupported } from "../errors.js";
import { DefinitionFacts, definitionMatches, matchNameOrTrait } from "../matching/definition.js";
import { matchingSubjectPermanentIds, subjectMatchesFilter, triggerAddedSecurityMatches } from "../matching/trigger.js";
import { permanentMatchesFilter } from "../matching/permanent.js";
import { resolvePermanentTargets } from "../targeting/permanents.js";
import { getCardDefinition } from "@aegis/shared";
import type { Action, Cost, Filter } from "@aegis/shared";

export const SUBTRIGGER_EVENT_MAP: Record<string, SubTriggerEventName | undefined> = {
  whenAttacking: "whenAttacking",
  whenOpponentAttacks: "whenOpponentAttacks",
  whenBlocked: "whenBlocked",
  whenBlockerActivated: "whenBlockerActivated",
  // Fired when an in-flight attack's target is redirected (＜Raid＞ / RedirectAttack).
  // The attacker is the event subject; a watcher gates on it via sourceFilter isSelfRef.
  whenAttackTargetSwitched: "whenAttackTargetSwitched",
  whenAttackTargetChanged: "whenAttackTargetSwitched",
  whenAttackTargetChanges: "whenAttackTargetSwitched",
  whenAttackTargetsChange: "whenAttackTargetSwitched",
  whenAttackTargetSwitch: "whenAttackTargetSwitched",
  whenSuspended: "whenSuspended",
  whenUnsuspended: "whenUnsuspended",
  // "whenUnsuspends" is a duplicate spelling introduced by earlier hand-fixed IR (BT24-028,
  // BT25-060). Canonical name is "whenUnsuspended" (matches the `whenSuspended` sibling's
  // tense); the two card files are normalized to it, but the map keeps this alias so any
  // other raw IR carrying the variant spelling still resolves instead of hitting
  // `unsupported()`.
  whenUnsuspends: "whenUnsuspended",
  whenBattleWon: "whenBattleWon",
  whenDeletesInBattle: "whenDeletesInBattle",
  whenOneOfYoursDigivolves: "whenOneOfYoursDigivolves",
  whenAnyDigivolves: "whenAnyDigivolves",
  whenHatch: "whenHatch",
  whenMovedFromBreeding: "whenMovedFromBreeding",
  whenOpponentMovedFromBreeding: "whenOpponentMovedFromBreeding",
  onDeletionOf: "onDeletionOf",
  whenSecurityRemoved: "whenSecurityRemoved",
  whenSecurityBattleEnded: "whenSecurityBattleEnded",
  // Alias used by the ST15 hand-authored module; both spellings share the
  // same security-removal payload and fire sites.
  whenSecurityCardRemoved: "whenSecurityRemoved",
  whenEffectRemovesFromSecurity: "whenEffectRemovesFromSecurity",
  whenAddSecurity: "whenAddSecurity",
  whenFaceUpCardsAddedToOpponentSecurity: "whenFaceUpCardsAddedToOpponentSecurity",
  onAddDigivolutionCards: "onAddDigivolutionCards",
  whenPlayed: "whenPlayed",
  whenOptionPlayed: "whenOptionPlayed",
  whenOptionInBattleAreaTrashed: "whenOptionInBattleAreaTrashed",
  // Legacy wording for a deletion-driven watcher. The deletion seam carries the
  // same subject permanent payload and source filters still narrow it precisely.
  whenEffectDeletes: "onDeletionOf",
  // Parser wording for "place [Option] in the battle area". The placement primitive emits
  // `whenOptionPlayed` as the canonical engine event (distinct from using its [Main] effect).
  whenPlacedInBattleArea: "whenOptionPlayed",
  whenLeavesPlay: "whenLeavesPlay",
  whenLinked: "whenLinked",
  whenLinkTrashed: "whenLinkTrashed",
  whenDigivolutionTrashed: "whenDigivolutionTrashed",
  onDigivolutionCardDiscarded: "onDigivolutionCardDiscarded",
  onDigivolutionCardsDiscardedBatch: "onDigivolutionCardsDiscardedBatch",
  onDigiBurstCardDiscarded: "onDigiBurstCardDiscarded",
  onDigivolutionCardReturnToDeckBottom: "onDigivolutionCardReturnToDeckBottom",
  whenTrashedFromHand: "whenTrashedFromHand",
  whenHandTrashed: "whenHandTrashed",
  onDiscardLibrary: "onDiscardLibrary",
  whenOptionUsed: "whenOptionUsed",
  whenEffectAddsToHand: "whenEffectAddsToHand",
  whenEffectAddsToOpponentHand: "whenEffectAddsToOpponentHand",
  whenEffectAddsToDeck: "whenEffectAddsToDeck",
  whenCardReturnsFromTrashToHand: "whenCardReturnsFromTrashToHand",
  whenEffectSuspends: "whenEffectSuspends",
  whenOpponentDraws: "whenOpponentDraws",
  // ＜Delay＞ watcher event (BT19-099): "when one of your Millenniummon would leave the battle
  // area". Maps to whenLeavesPlay; sourceFilter on the SubTrigger restricts the leaving Digimon.
  whenDigimonWouldLeave: "whenLeavesPlay",
  startOfYourMainPhase: "startOfYourMainPhase",
  // GainTriggeredEffect in card IR may encode the trigger with a capital 'S' (runtime record output).
  StartOfYourMainPhase: "startOfYourMainPhase",
  endOfTurn: "endOfTurn",
  endOfOpponentTurn: "endOfOpponentTurn",
  // "When [matching Digimon] WOULD BE returned to hand/deck" — fires before the return executes.
  // sourceFilter.returnDestination optionally restricts which destinations arm the watcher (CAP-C-11).
  wouldBeReturned: "wouldBeReturned",
  // "When [this card] is trashed by an effect [while in the battle area]" (BT19-093; CAP-E8).
  whenTrashedByEffect: "whenTrashedByEffect",
  // "When this card is trashed from the deck" (BT19-097; CAP-H-01). Fires per milled card;
  // sourceFilter.isSelfRef gates on the milled card ID matching the watcher's source card ID.
  whenTrashedFromDeck: "whenTrashedFromDeck",
  // "When your Digimon checks a face-up security card" (BT20-055; CAP-H-03). Fires at
  // security-check time when the revealed card was already face-up before the check.
  whenCheckedFaceUpSecurity: "whenCheckedFaceUpSecurity",
};

/**
 * Install a delayed/triggered sub-effect on the engine's sub-trigger bus. The body
 * runs the sub-effect's actions when the engine fires the matching event. A "raw"
 * event (one the parser could not classify) is a loud gap.
 */
export async function runSubTrigger(
  ctx: EffectContext,
  action: Extract<Action, { kind: "SubTrigger" }>,
): Promise<void> {
  const event = SUBTRIGGER_EVENT_MAP[action.event];
  if (event === undefined) {
    unsupported(ctx, action, `SubTrigger event "${action.event}" is not a known game event`);
    return;
  }
  // The watcher anchors on the SOURCE by default ("when THIS Digimon attacks"). When the
  // clause grants the trigger to a CHOSEN OTHER permanent ("give 1 of your opponent's
  // Digimon '[Start of Your Main Phase] This Digimon attacks'", documented behavior), `action.on`
  // resolves to that permanent and the watcher is installed on IT — so the sub-effect's
  // "this Digimon" / controller scope resolve to the GRANTED permanent, not the granter.
  const playerScoped = action.playerScoped === true;
  if (playerScoped && action.on !== undefined) {
    unsupported(ctx, action, "player-scoped SubTrigger cannot also target a permanent anchor");
    return;
  }
  const self = ctx.source.permanent();
  let anchorPermanentId = playerScoped ? undefined : self?.permanentId;
  let expiresOnTurnEndOf: typeof ctx.source.ownerSeat | undefined;
  if (action.on !== undefined) {
    const targetIds = await resolvePermanentTargets(ctx, action.on);
    const grantTo = targetIds[0];
    if (grantTo === undefined) return; // no eligible permanent chosen => nothing is granted
    anchorPermanentId = grantTo;
    // A granted watcher with an until-owner-turn-end lifecycle
    // expires when the GRANTED permanent's owner's turn ends. The duration ref names the
    // window relative to the granter; `untilOpponentTurnEnd` (the opponent's turn end) is the
    // owner's-turn-end of the chosen opponent permanent.
    if (action.duration === "untilOpponentTurnEnd" || action.duration === "untilYourTurnEnd") {
      const granted = ctx.game.permanentById(grantTo);
      if (granted !== undefined) expiresOnTurnEndOf = granted.controllerSeat;
    }
  }
  if (playerScoped) {
    if (action.duration === "untilOpponentTurnEnd" || action.duration === "endOfOpponentTurn") {
      expiresOnTurnEndOf = ctx.game.opponentOf(ctx.source.ownerSeat);
    } else if (action.duration === "untilYourTurnEnd") {
      expiresOnTurnEndOf = ctx.source.ownerSeat;
    } else if (action.duration === "forTheTurn") {
      expiresOnTurnEndOf = ctx.source.ownerSeat;
    } else {
      unsupported(ctx, action, "player-scoped SubTrigger requires a turn-end duration");
      return;
    }
  }
  // Capture the per-install sourceFilter ("a green Tamer", "a [Puppet] Digimon") so the
  // engine fires this sub-effect ONLY for a matching event payload. Without it every
  // filtered watcher would run on every play/deletion of its event kind (RESEARCH BLK-01
  // "Model gap" / Pitfall 2: BT10-044 would draw on every play, not just a green Tamer).
  // The filter is evaluated against the freshly bound context's payload subject via the
  // canonical `permanentMatchesFilter` / `definitionMatches` — never a hand-rolled matcher.
  const sourceFilter = action.sourceFilter;
  const hostFilter = (action as Action & { hostFilter?: Filter }).hostFilter;
  // Some deletion reactions explicitly require their host to survive the same deletion batch
  // (BT22-065 Q4923; BT22-068 Q4928; BT22-070 Q4929). Deletion seams publish the complete
  // simultaneous permanent set, so reject the activation when it contains this watcher anchor.
  const notSimultaneousGate =
    action.notSimultaneous === true && anchorPermanentId !== undefined
      ? (subCtx: EffectContext): boolean => !(subCtx.trigger.deletedPermanentIds ?? []).includes(anchorPermanentId)
      : undefined;
  // Security-removal events carry no subject permanent — their payload names the seat whose
  // security lost a card. Interpret sourceFilter.controller as the watched stack direction:
  // most cards watch "your" stack, while BT9-016 watches the opponent's stack.
  const securityRemovalGate =
    event === "whenEffectRemovesFromSecurity" || event === "whenSecurityRemoved"
      ? (subCtx: EffectContext): boolean => {
          const removedSeat = subCtx.trigger?.removedFromSecuritySeat;
          if (removedSeat === undefined) return false;
          const direction = sourceFilter?.controller ?? "mine";
          if (direction === "any") return true;
          const watchedSeat =
            direction === "opponent" ? subCtx.game.opponentOf(subCtx.source.ownerSeat) : subCtx.source.ownerSeat;
          return removedSeat === watchedSeat;
        }
      : undefined;
  // `onDiscardLibrary` carries no subject permanent — its payload (`addedToHand.byEffect.ownerSeat`)
  // names the seat whose deck top was milled. The watcher's sourceFilter (controller "opponent"/
  // "mine") cannot be a subject filter here; gate instead on the milled deck's owner matching the
  // requested controller relative to the watcher's seat (BT14-077 "when a card in your OPPONENT's
  // deck is trashed"). Defaults to "opponent" since that is the only printed direction in-catalog.
  const discardLibraryGate =
    event === "onDiscardLibrary"
      ? (subCtx: EffectContext): boolean => {
          const milledSeat = subCtx.trigger?.addedToHand?.byEffect?.ownerSeat;
          if (milledSeat === undefined) return false;
          const want = sourceFilter?.controller ?? "opponent";
          if (want === "any") return true;
          const wantSeat =
            want === "opponent" ? subCtx.game.opponentOf(subCtx.source.ownerSeat) : subCtx.source.ownerSeat;
          return milledSeat === wantSeat;
        }
      : undefined;
  const filterMatch =
    sourceFilter === undefined ||
    event === "whenEffectRemovesFromSecurity" ||
    event === "whenSecurityRemoved" ||
    event === "onDiscardLibrary" ||
    event === "onDigivolutionCardReturnToDeckBottom" ||
    event === "whenHandTrashed" ||
    event === "whenOpponentDraws" ||
    event === "endOfOpponentTurn" ||
    event === "whenEffectAddsToOpponentHand" ||
    // whenHatch/whenEffectAddsToHand/whenEffectAddsToDeck/whenCardReturnsFromTrashToHand carry
    // either no subject permanent, or (whenHatch) a subject the generic subjectMatchesFilter
    // can't apply the right "mine"/"opponent" default direction to; each has its own dedicated
    // gate below instead.
    event === "whenHatch" ||
    event === "whenFaceUpCardsAddedToOpponentSecurity" ||
    event === "whenEffectAddsToHand" ||
    event === "whenEffectAddsToDeck" ||
    event === "whenCardReturnsFromTrashToHand" ||
    // whenTrashedByEffect uses trashedByEffectPermanentId (not subjectPermanentId); the
    // isSelfRef + zone gates are handled entirely by whenTrashedByEffectGate below.
    event === "whenTrashedByEffect" ||
    // whenTrashedFromHand fires for a loose hand card (no permanent); the isSelfRef gate
    // is handled by whenTrashedFromHandGate below.
    event === "whenTrashedFromHand" ||
    // whenTrashedFromDeck fires for a loose deck card (no permanent); the isSelfRef gate
    // is handled entirely by whenTrashedFromDeckGate below.
    event === "whenTrashedFromDeck" ||
    event === "onDigivolutionCardDiscarded" ||
    event === "onDigivolutionCardsDiscardedBatch" ||
    event === "onDigiBurstCardDiscarded"
      ? undefined
      : (subCtx: EffectContext): boolean => subjectMatchesFilter(subCtx, sourceFilter);
  // `onDigivolutionCardReturnToDeckBottom` fires for EVERY watcher (the bus is not host-scoped), so
  // gate on (a) the host that lost the stack card (TriggerInfo.subjectPermanentId) being THIS
  // watcher's own anchor permanent — i.e. "this Digimon's digivolution cards" — and (b) the returned
  // card's name matching the watcher's `sourceFilter` (BT11-065: "[Vemmon]").
  const digivolutionReturnGate =
    event === "onDigivolutionCardReturnToDeckBottom"
      ? (subCtx: EffectContext): boolean => {
          const anchor = subCtx.source.permanent()?.permanentId;
          if (anchor === undefined || anchor !== subCtx.trigger?.subjectPermanentId) return false;
          if (sourceFilter === undefined) return true;
          const refs = sourceFilter.nameOrTrait;
          if (refs === undefined || refs.length === 0) return true;
          const cardId = subCtx.trigger?.returnedToDeckCardId;
          if (cardId === undefined) return false;
          const def = getCardDefinition(cardId);
          if (def === undefined) return false;
          return refs.some((ref) => matchNameOrTrait(def as DefinitionFacts, ref));
        }
      : undefined;
  // `whenHandTrashed` carries no subject permanent — its payload names the seat whose hand an
  // action just trashed from. The watcher ("[All Turns] when YOUR hand is trashed from", BT25-084)
  // has no subject sourceFilter; gate purely on the trashed hand being the watcher controller's own.
  const handTrashedGate =
    event === "whenHandTrashed"
      ? (subCtx: EffectContext): boolean => subCtx.trigger?.handTrashedSeat === subCtx.source.ownerSeat
      : undefined;
  // "When THIS Digimon's attack target is switched" is host-scoped, which the IR marks with a
  // self-referencing sourceFilter. The event bus broadcasts every switch to every watcher, so
  // bind the payload attacker to the permanent carrying this effect. Without this gate
  // BT11-008/010/014 reacted to a neighboring Digimon being blocked or using Raid. A watcher
  // that is NOT self-referencing (BT22-083's Tamer grants to another Digimon) keeps the
  // broader subject gate instead.
  const attackTargetSwitchedGate =
    event === "whenAttackTargetSwitched" && sourceFilter?.isSelfRef === true && anchorPermanentId !== undefined
      ? (subCtx: EffectContext): boolean => subCtx.trigger.attackerPermanentId === anchorPermanentId
      : undefined;
  // A deferred [Security] payload belongs to the exact checked card whose security battle
  // is ending. The watcher is installed while that card is face-up in security and follows
  // its source instance into trash; identity must therefore use the event's security card id,
  // not a battle-area permanent anchor.
  const securityBattleEndedGate =
    event === "whenSecurityBattleEnded"
      ? (subCtx: EffectContext): boolean => subCtx.trigger.securityInstanceId === ctx.source.instanceId
      : undefined;
  // `whenEffectSuspends` without an explicit sourceFilter is the printed self-scoped form:
  // "when an effect suspends THIS Digimon" (EX3-038 and its family). The bus broadcasts every
  // effect-suspension, including the opponent Digimon suspended by the watcher's own body, so
  // leaving this ungated makes every copy react to every Digimon and recursively suspend the
  // opponent's entire board. Filtered forms ("when your effect suspends a Tamer") deliberately
  // keep their broader subject gate above.
  const effectSuspendsSelfGate =
    event === "whenEffectSuspends" && sourceFilter === undefined && anchorPermanentId !== undefined
      ? (subCtx: EffectContext): boolean => subCtx.trigger.suspendedPermanentId === anchorPermanentId
      : undefined;
  // `whenSuspended` is a board-wide bus. The single-card payload historically carries only
  // `suspendedPermanentId`, while a simultaneous suspension additionally carries
  // `subjectPermanentIds`; bind an isSelfRef watcher to its physical host across both shapes.
  const whenSuspendedSelfGate =
    event === "whenSuspended" && sourceFilter?.isSelfRef === true && anchorPermanentId !== undefined
      ? (subCtx: EffectContext): boolean => {
          const suspendedIds =
            subCtx.trigger.subjectPermanentIds ??
            (subCtx.trigger.suspendedPermanentId !== undefined ? [subCtx.trigger.suspendedPermanentId] : []);
          return suspendedIds.includes(anchorPermanentId);
        }
      : undefined;
  // `whenOpponentDraws` carries no subject permanent — its payload names the seat that just drew.
  // The watcher reacts only when the DRAWING seat is the watcher controller's OPPONENT ("when YOUR
  // OPPONENT draws a card"). Gate: drawingSeat !== watcher's owner seat (i.e. it is the opponent).
  const whenOpponentDrawsGate =
    event === "whenOpponentDraws"
      ? (subCtx: EffectContext): boolean => {
          const ds = subCtx.trigger?.drawingSeat;
          return ds !== undefined && ds !== subCtx.source.ownerSeat;
        }
      : undefined;
  // `endOfOpponentTurn` ("at the end of your opponent's turn", EX3-069/EX4-058/EX4-071/EX6-070/
  // BT16-084/BT16-085/BT16-088/BT17-025): fires unconditionally at every OnEndTurn window (the
  // same seam as the plain `endOfTurn` sibling) with NO trigger payload at all, so there is no
  // per-fire field to read. Instead read the ambient game state directly: `state.turnSeat` is
  // still the ENDING player's seat at this exact fire point (the turn machine has not advanced
  // it yet) — the watcher fires only when that seat is its own controller's OPPONENT.
  const endOfOpponentTurnGate =
    event === "endOfOpponentTurn"
      ? (subCtx: EffectContext): boolean => subCtx.game.state.turnSeat !== subCtx.source.ownerSeat
      : undefined;
  // `whenEffectAddsToOpponentHand` carries no subject permanent — its payload names the seat an
  // EFFECT just added cards to. The watcher ("[All Turns] when an effect adds cards to your
  // opponent's hand") reacts only when that seat is its controller's OPPONENT. This is broader
  // than `whenOpponentDraws` (any effect-driven add, not just the draw action) and excludes the
  // normal draw-phase draw (which never routes through the effect hand-add seams).
  const effectAddsToOpponentHandGate =
    event === "whenEffectAddsToOpponentHand"
      ? (subCtx: EffectContext): boolean => {
          const seat = subCtx.trigger?.effectAddedToHandSeat;
          return seat !== undefined && seat !== subCtx.source.ownerSeat;
        }
      : undefined;
  // `whenHatch` ("[All Turns] when YOU hatch [a Digi-Egg] in the breeding area", BT17-093;
  // KB Q2877: playing INTO breeding without hatching does not count). The payload names the
  // freshly-hatched permanent as the subject; gate on ITS controller matching the watcher's
  // requested seat (sourceFilter.controller — absent means "mine", the only printed
  // direction in-catalog, mirroring onDiscardLibrary's default-direction convention).
  const whenHatchGate =
    event === "whenHatch"
      ? (subCtx: EffectContext): boolean => {
          const hatchedId = subCtx.trigger?.subjectPermanentId;
          if (hatchedId === undefined) return false;
          const hatchedSeat = subCtx.game.permanentById(hatchedId)?.controllerSeat;
          if (hatchedSeat === undefined) return false;
          const want = sourceFilter?.controller ?? "mine";
          if (want === "any") return true;
          const wantSeat =
            want === "opponent" ? subCtx.game.opponentOf(subCtx.source.ownerSeat) : subCtx.source.ownerSeat;
          return hatchedSeat === wantSeat;
        }
      : undefined;
  // `whenFaceUpCardsAddedToOpponentSecurity` ("[Your Turn] when face-up cards are added to
  // your opponent's security stack", EX11-004; KB Q5789/Q5790 binding: fires both when an
  // effect adds a face-up card AND when a security CHECK flips an existing face-down card
  // face up — "added" means "became visibly present face up", not just "newly placed").
  // Shares the whenAddSecurity payload shape (addedToSecuritySeat/addedToSecurityInstanceIds)
  // fired from the same primitives.ts seams, plus a dedicated fire at the security-check flip
  // point (securityCheck.ts) for the check-reveal half. The "ToOpponentSecurity" direction is
  // baked into the name itself (unlike whenAddSecurity, which defaults to "mine"), so the gate
  // hardcodes the opponent-seat check; `triggerAddedSecurityMatches` supplies the "at least one
  // added/flipped card is actually face-up" half (shared with whenAddSecurity's own gate).
  const whenFaceUpCardsAddedToOpponentSecurityGate =
    event === "whenFaceUpCardsAddedToOpponentSecurity"
      ? (subCtx: EffectContext): boolean => {
          const seat = subCtx.trigger?.addedToSecuritySeat;
          if (seat === undefined) return false;
          if (seat !== subCtx.game.opponentOf(subCtx.source.ownerSeat)) return false;
          return triggerAddedSecurityMatches(subCtx, sourceFilter);
        }
      : undefined;
  // `whenEffectAddsToHand` ("[Your Turn] when an effect adds cards to YOUR hand", BT9-002/
  // BT15-083/BT17-083; KB Q1794/Q1795/Q2861 binding: fires for effect Draw and Return-to-hand,
  // per-add-operation regardless of net hand-size change; Q2862 excludes the digivolution-
  // bonus hand increase, which never routes through these seams anyway). The "mine" mirror of
  // whenEffectAddsToOpponentHand, sharing its effectAddedToHandSeat payload and fire sites.
  const effectAddsToHandGate =
    event === "whenEffectAddsToHand"
      ? (subCtx: EffectContext): boolean => {
          const seat = subCtx.trigger?.effectAddedToHandSeat;
          return seat !== undefined && seat === subCtx.source.ownerSeat;
        }
      : undefined;
  // `whenEffectAddsToDeck` ("[Your Turn] when your effects add to decks", BT26-015): mirrors
  // whenEffectAddsToHand one zone over, fired from returnToDeck's seam (effectAddedToDeckSeat).
  // "Mine" direction by the same convention (the recipient deck's owner matching the watcher).
  const effectAddsToDeckGate =
    event === "whenEffectAddsToDeck"
      ? (subCtx: EffectContext): boolean => {
          const seat = subCtx.trigger?.effectAddedToDeckSeat;
          return seat !== undefined && seat === subCtx.source.ownerSeat;
        }
      : undefined;
  // `whenCardReturnsFromTrashToHand` ("[All Turns] when a [red] Digimon card returns from your
  // trash to the hand", BT15-082/BT16-011): a returnToHand carrying loose cards (no subject
  // permanent), scoped to the watcher's own seat ("your trash") and to the sourceFilter's
  // color/kind/trait against each returned card's definition.
  const cardReturnsFromTrashToHandGate =
    event === "whenCardReturnsFromTrashToHand"
      ? (subCtx: EffectContext): boolean => {
          const seat = subCtx.trigger?.returnedFromTrashSeat;
          if (seat === undefined || seat !== subCtx.source.ownerSeat) return false;
          const cardIds = subCtx.trigger?.returnedFromTrashCardIds ?? [];
          if (cardIds.length === 0) return false;
          if (sourceFilter === undefined) return true;
          return cardIds.some((cardId) => {
            const def = getCardDefinition(cardId);
            return def !== undefined && definitionMatches(sourceFilter, def as DefinitionFacts);
          });
        }
      : undefined;
  // Event payloads attributed to an effect carry the acting seat. `bySourceController`
  // enforces printed clauses such as "one of YOUR effects suspends" and "using one of YOUR
  // effects, trash a card in your hand" without conflating the affected card's controller
  // with the effect's controller. Events without attribution fail this opt-in gate.
  const bySourceControllerGate =
    action.bySourceController !== undefined
      ? (subCtx: EffectContext): boolean => {
          const actingSeat =
            event === "whenEffectSuspends" ? subCtx.trigger?.effectSuspendSeat : subCtx.trigger?.byEffectSeat;
          if (actingSeat === undefined) return false;
          const own = subCtx.source.ownerSeat;
          return action.bySourceController === "mine" ? actingSeat === own : actingSeat !== own;
        }
      : undefined;
  // `startOfYourMainPhase` fires at EVERY main-phase start; the watcher must fire ONLY at the
  // watched permanent's owner's main phase, while it is still on the battle area — the
  // server-side turn-ownership + on-field re-check that stops a client forcing the granted
  // is anchored on the granted permanent, so its CardSource helpers answer for THAT permanent.
  const ownerMainPhaseGate =
    event === "startOfYourMainPhase"
      ? (subCtx: EffectContext): boolean => subCtx.source.isOwnersTurn() && subCtx.source.isOnBattleArea()
      : undefined;
  // A fire-time payload gate ("your security" + the added-card trait check for whenAddSecurity)
  // evaluated against the freshly bound context's TriggerInfo. When it does not hold the watcher
  // body is skipped entirely, so a mandatory tail never runs on an off-gate event (BT23-083).
  const fireConditionGate =
    action.fireCondition === undefined
      ? undefined
      : (subCtx: EffectContext): boolean => evaluateCondition(subCtx, action.fireCondition!);
  // `wouldBeReturned` carries TriggerInfo.returnDestination (the zone the permanent would land in).
  // A watcher with `sourceFilter.returnDestination` only fires when the return target matches that
  // list (BT20-074: ["hand","deck"] — not trash). Absent => no destination gate.
  const returnDestinationGate =
    event === "wouldBeReturned" && sourceFilter?.returnDestination !== undefined
      ? (subCtx: EffectContext): boolean => {
          const dest = subCtx.trigger?.returnDestination;
          return dest !== undefined && (sourceFilter.returnDestination as string[]).includes(dest);
        }
      : undefined;
  // `whenTrashedByEffect` (CAP-E8, BT19-093): fires when the watcher's own anchor permanent
  // is trashed by an effect (the `isSelfRef` sourceFilter means "this card specifically") — OR,
  // for a watcher with NO isSelfRef (a plain kind/zone/color filter, e.g. "an Option in the
  // battle area", P-203/EX7-070/P-159 — the previously-dead "whenEffectTrashes" name collapsed
  // onto this already-live event, since both describe the exact same effect-driven trash seam),
  // matches ANY permanent trashed by an effect whose live definition satisfies that filter
  // (the trashed permanent is still live in the battle area at fire time — see the seam comment
  // in primitives.ts — so its definition/color/kind can be read before it leaves the field).
  // `zone: "battleArea"` requires the permanent was in the battle area at the time (the seam
  // in `deletePermanent` fires only from battle area, so this gate is always true — kept here
  // for explicitness and in case future seams fire from other zones).
  const whenTrashedByEffectGate =
    event === "whenTrashedByEffect"
      ? (subCtx: EffectContext): boolean => {
          const trashedId = subCtx.trigger?.trashedByEffectPermanentId;
          if (trashedId === undefined) return false;
          if (sourceFilter?.zone !== undefined && sourceFilter.zone !== "battleArea") return false;
          if (sourceFilter === undefined || sourceFilter.isSelfRef === true) {
            const anchor = subCtx.source.permanent()?.permanentId ?? anchorPermanentId;
            return anchor !== undefined && trashedId === anchor;
          }
          const def = subCtx.game.permanentById(trashedId)?.topCard;
          if (def === undefined) return false;
          return definitionMatches(sourceFilter, subCtx.game.definitionOf(def) as DefinitionFacts);
        }
      : undefined;
  // `whenTrashedFromDeck` (CAP-H-01, BT19-097): fires per-card when a card is milled from the
  // deck by a TrashTopDeck action. The payload carries `trashedFromDeckCardId` (the card ID of
  // the milled card, not a permanent ID — it is a loose deck card). `sourceFilter.isSelfRef` means
  // "fire only when the milled card ID matches THIS watcher's source card ID." No subject permanent
  // exists; the generic `filterMatch` path is bypassed for this event.
  const whenTrashedFromDeckGate =
    event === "whenTrashedFromDeck"
      ? (subCtx: EffectContext): boolean => {
          const milledCardId = subCtx.trigger?.trashedFromDeckCardId;
          if (milledCardId === undefined) return false;
          if (
            action.excludeSelfEffect === true &&
            subCtx.trigger?.trashedFromDeckByEffectCardId === subCtx.source.cardId
          ) {
            return false;
          }
          if (sourceFilter?.isSelfRef === true) {
            return milledCardId === subCtx.source.cardId;
          }
          return true;
        }
      : undefined;
  const whenTrashedFromHandGate =
    event === "whenTrashedFromHand"
      ? (subCtx: EffectContext): boolean => {
          const cardId = subCtx.trigger?.trashedFromHandCardId;
          if (cardId === undefined) return false;
          const seat = subCtx.trigger?.handTrashedSeat;
          if (seat !== undefined && seat !== subCtx.source.ownerSeat) return false;
          if (sourceFilter?.isSelfRef === true) {
            return subCtx.trigger?.trashedFromHandInstanceId === subCtx.source.instanceId;
          }
          return true;
        }
      : undefined;
  const digivolutionCardDiscardedGate =
    (event === "onDigivolutionCardDiscarded" ||
      event === "onDigivolutionCardsDiscardedBatch" ||
      event === "onDigiBurstCardDiscarded") &&
    sourceFilter?.isSelfRef === true
      ? (subCtx: EffectContext): boolean => {
          const matched =
            event === "onDigiBurstCardDiscarded" || event === "onDigivolutionCardsDiscardedBatch"
              ? (subCtx.trigger?.trashedDigivolutionInstanceIds ?? []).includes(subCtx.source.instanceId)
              : subCtx.trigger?.trashedDigivolutionInstanceId === subCtx.source.instanceId;
          return matched;
        }
      : undefined;
  const digivolutionHostFilterGate =
    hostFilter !== undefined &&
    (event === "onDigivolutionCardDiscarded" || event === "onDigivolutionCardsDiscardedBatch")
      ? (subCtx: EffectContext): boolean => {
          const hostId = subCtx.trigger?.subjectPermanentId;
          const host = hostId === undefined ? undefined : subCtx.game.permanentById(hostId);
          return host !== undefined && permanentMatchesFilter(subCtx, host, hostFilter, subCtx.source);
        }
      : undefined;
  const effectSourceGate =
    action.effectSourceFilter === undefined
      ? undefined
      : (subCtx: EffectContext): boolean => {
          const cardId = subCtx.trigger?.byEffectCardId;
          if (cardId === undefined) return false;
          const def = subCtx.game.definitionOf({ cardId } as never);
          return definitionMatches(action.effectSourceFilter!, def as DefinitionFacts);
        };
  // `triggerFilter` on an `onAddDigivolutionCards` watcher (LANE-F-15, BT20-080/BT21-080):
  // restricts WHICH permanent's digivolution-card additions fire this watcher. The event's
  // `subjectPermanentId` is the RECEIVER permanent (the Digimon whose stack grew). Gate on that
  // permanent matching the filter, evaluated via the same `subjectMatchesFilter` path that the
  // generic `filterMatch` uses for `sourceFilter` on other events.
  //   BT20-080: { isSelfRef: true } — fires only when cards are placed under THIS permanent.
  //   BT21-080: { kind: ["Digimon"], nameOrTrait: [...] } — receiver must be Gammamon/Hero trait.
  // For attack events (whenAttacking / whenOpponentAttacks) the event subject is the
  // ATTACKER, so the same subject-filter gate lets a watcher fire only when the attacker matches —
  // including relative gates like `digivolutionCardsCompareToSource` ("with as many or fewer
  // digivolution cards as this Digimon attacks", BT15-032 and AD1/BT16-family cards).
  const ATTACK_TRIGGER_FILTER_EVENTS = new Set(["whenAttacking", "whenOpponentAttacks"]);
  const triggerFilterGate =
    action.triggerFilter !== undefined &&
    (event === "onAddDigivolutionCards" || ATTACK_TRIGGER_FILTER_EVENTS.has(event))
      ? (subCtx: EffectContext): boolean => subjectMatchesFilter(subCtx, action.triggerFilter!)
      : undefined;
  const addedDigivolutionCardGate =
    event === "onAddDigivolutionCards" && action.addedDigivolutionCardFilter !== undefined
      ? (subCtx: EffectContext): boolean => {
          const subjectId = subCtx.trigger?.subjectPermanentId;
          const ids = subCtx.trigger?.addedDigivolutionCardInstanceIds ?? [];
          if (subjectId === undefined || ids.length === 0) return false;
          const subject = subCtx.game.permanentById(subjectId);
          if (subject === undefined) return false;
          return subject.stack.some(
            (card) =>
              ids.includes(card.instanceId) &&
              (action.addedDigivolutionCardFilter!.faceDown !== true || card.faceUp === false) &&
              (action.addedDigivolutionCardFilter!.faceUp !== true || card.faceUp === true) &&
              definitionMatches(action.addedDigivolutionCardFilter!, subCtx.game.definitionOf(card)),
          );
        }
      : undefined;
  // `sourceFilter.nameMatchesInheritedHost` (CAP-G2, BT2-059 Kurisarimon): fires ONLY when the
  // played card's name matches the HOST permanent's current top-card name. "This Digimon" in an
  // inherited effect text refers to the Digimon whose digivolution stack contains this card —
  // the anchor permanent. KB Q1024: compare at fire time so a digivolved host's new top-card
  // name is used. The event subject is the just-played permanent (subjectPermanentId).
  const inheritedHostNameGate =
    sourceFilter?.nameMatchesInheritedHost === true
      ? (subCtx: EffectContext): boolean => {
          const hostPerm = anchorPermanentId !== undefined ? subCtx.game.permanentById(anchorPermanentId) : undefined;
          if (hostPerm?.topCard === undefined) return false;
          const hostName = subCtx.game.definitionOf(hostPerm.topCard).nameEn;
          if (hostName === undefined) return false;
          const subjectId = subCtx.trigger.subjectPermanentId;
          if (subjectId === undefined) return false;
          const subject = subCtx.game.permanentById(subjectId);
          if (subject?.topCard === undefined) return false;
          const subjectName = subCtx.game.definitionOf(subject.topCard).nameEn;
          return subjectName === hostName;
        }
      : undefined;
  const sourceDeleteCause = (sourceFilter as (Filter & { deleteCause?: "dpReachedZero" }) | undefined)?.deleteCause;
  const deleteCauseGate =
    event === "onDeletionOf" && sourceDeleteCause === "dpReachedZero"
      ? (subCtx: EffectContext): boolean => subCtx.trigger.removalCause === "byRule"
      : undefined;
  const trashedDigivolutionTopGate =
    event === "whenDigivolutionTrashed" && action.requireTrashedDigivolutionCardWasTop === true
      ? (subCtx: EffectContext): boolean => subCtx.trigger.trashedDigivolutionCardWasTop === true
      : undefined;
  const gates = [
    filterMatch,
    ownerMainPhaseGate,
    fireConditionGate,
    securityRemovalGate,
    discardLibraryGate,
    digivolutionReturnGate,
    handTrashedGate,
    attackTargetSwitchedGate,
    securityBattleEndedGate,
    effectSuspendsSelfGate,
    whenSuspendedSelfGate,
    whenOpponentDrawsGate,
    endOfOpponentTurnGate,
    effectAddsToOpponentHandGate,
    whenHatchGate,
    whenFaceUpCardsAddedToOpponentSecurityGate,
    effectAddsToHandGate,
    effectAddsToDeckGate,
    cardReturnsFromTrashToHandGate,
    bySourceControllerGate,
    returnDestinationGate,
    whenTrashedByEffectGate,
    whenTrashedFromDeckGate,
    whenTrashedFromHandGate,
    digivolutionCardDiscardedGate,
    digivolutionHostFilterGate,
    effectSourceGate,
    triggerFilterGate,
    addedDigivolutionCardGate,
    inheritedHostNameGate,
    deleteCauseGate,
    notSimultaneousGate,
    trashedDigivolutionTopGate,
  ].filter((g): g is (subCtx: EffectContext) => boolean => g !== undefined);
  const matches = gates.length === 0 ? undefined : (subCtx: EffectContext): boolean => gates.every((g) => g(subCtx));
  // Inherited effects that trigger when their own source card is discarded from a
  // digivolution stack must keep that card as the watcher source. The host permanent
  // remains on the field, but the source card moves to trash before the event fires;
  // anchoring the watcher to the host would make `isSelfRef` compare against the host's
  // top card and silently skip the inherited effect (BT7 Digi-Burst cards).
  const discardedSelfSource =
    sourceFilter?.isSelfRef === true &&
    (event === "onDigiBurstCardDiscarded" ||
      event === "onDigivolutionCardsDiscardedBatch" ||
      event === "onDigivolutionCardDiscarded");
  ctx.fx.subscribeSubTrigger({
    event,
    ...(discardedSelfSource ? {} : { sourcePermanentId: anchorPermanentId }),
    ...(playerScoped
      ? { activationContext: ctx }
      : action.on !== undefined
        ? {}
        : { sourceInstanceId: ctx.source.instanceId }),
    // Anchor-less fallback (the eighth engine gap): when there is no on-field permanent to
    // anchor to AND the clause was not granted to another permanent (both cases already set
    // anchorPermanentId), the watcher's source is a loose hand/trash-resident CardInstance —
    // bind the fallback anchor to ITS instance so the engine can still resolve a context.
    // A watcher is one-shot only when the clause says so ("at the NEXT end of your opponent's
    // turn", EX3-069 / KB Q5722). `fire` evaluates `matches` BEFORE marking a sub as fired, so a
    // one-shot survives the turn ends its gates reject. Default: persists until its anchor leaves.
    once: action.once === true,
    ...(matches ? { matches } : {}),
    ...(expiresOnTurnEndOf !== undefined ? { expiresOnTurnEndOf } : {}),
    ...(action.oncePerTiming ? { oncePerTiming: true } : {}),
    ...(action.oncePerTiming
      ? {
          oncePerTimingIdentity: `${ctx.source.instanceId}/${event}/${JSON.stringify({
            sourceFilter: action.sourceFilter,
            actions: action.actions,
            raw: action.raw,
          })}`,
        }
      : {}),
    ...(action.oncePerTurnKey ? { oncePerTurnKey: `${ctx.source.instanceId}/${action.oncePerTurnKey}` } : {}),
    description: action.raw,
    run: async (subCtx) => {
      // Preserve the printed clause timing on every decision opened by the future watcher.
      // The freshly rebound context carries the event payload but not the installing effect's
      // activeTiming; without this, UI provenance degrades to a card-only guess (EX3-038's
      // opponent-target prompt lost its [Your Turn] label entirely).
      subCtx.activeTiming ??= ctx.activeTiming;
      subCtx.activeEffectText ??= ctx.activeEffectText;
      // A simultaneous play is one whenPlayed event, but a filtered watcher binds "those
      // Digimon" only to the members of that event that satisfied its sourceFilter. Keep the
      // narrowed provenance on this activation context so sourceRef:"triggerSubject" cannot
      // offer an unrelated card that happened to be played by the same effect (Q3664).
      if (sourceFilter !== undefined && (subCtx.trigger.subjectPermanentIds?.length ?? 0) > 1) {
        const matchingIds = matchingSubjectPermanentIds(subCtx, sourceFilter);
        subCtx.trigger = {
          ...subCtx.trigger,
          subjectPermanentIds: matchingIds,
          subjectPermanentId: matchingIds[0],
        };
      }
      // SubTrigger bodies share the same selection-binding contract as top-level effects.
      // A freshly-built watcher context has no map by default; without initializing it,
      // SelectBind silently drops the chosen permanent and every following
      // fromSelectionRef action no-ops (BT8-081's +3000 DP / unsuspend pair).
      subCtx.selections ??= new Map();
      // CAP-E14: an intrinsic ＜Delay＞ gate (`withIntrinsicDelayGate`, comprehensive rules
      // §16-17) — this watcher belongs to a card printing ＜Delay＞ directly on a continuous
      // trigger. Its OWN optional-ask/cost supersedes `action.optional` below: §16-17-1 makes
      // trashing the source card the activation cost, and §16-17-3 bars activation the turn it
      // entered play.
      if ((action as { delayArmedIntrinsic?: boolean }).delayArmedIntrinsic === true) {
        const self = subCtx.source.permanent();
        if (self === undefined) return;
        if (self.enterFieldTurnCount === subCtx.game.state.turnCount) return;
        const activate = await subCtx.ask.optional(
          subCtx,
          action.raw ?? "Trash this card to activate its ＜Delay＞ effect?",
        );
        if (!activate) return;
        const trashed = await subCtx.fx.deletePermanent([self.permanentId]);
        if (trashed <= 0) return;
      } else {
        const activationCost = action.cost as Cost | undefined;
        const activationCostOptions = (action.costOptions ?? []) as Cost[];
        const additionalCosts = [
          ...((action.additionalCosts ?? []) as Cost[]),
          ...(action.additionalCost !== undefined ? [action.additionalCost as Cost] : []),
        ];
        const hasActivationCost =
          activationCost !== undefined || activationCostOptions.length > 0 || additionalCosts.length > 0;
        if (activationCost !== undefined && !canPayCost(subCtx, activationCost)) return;
        if (activationCostOptions.length > 0 && !activationCostOptions.some((cost) => canPayCost(subCtx, cost))) return;
        if (additionalCosts.some((cost) => !canPayCost(subCtx, cost))) return;

        if (action.optional === true || hasActivationCost) {
          const yes = await subCtx.ask.optional(
            subCtx,
            action.raw ?? activationCost?.raw ?? "Activate this triggered effect?",
          );
          if (!yes) return;
        }
        if (activationCostOptions.length > 0) {
          if (!(await payOneCostOption(subCtx, activationCostOptions))) return;
        } else if (activationCost !== undefined) {
          if (!(await payCost(subCtx, activationCost))) return;
        }
        for (const cost of additionalCosts) {
          if (!(await payCost(subCtx, cost))) return;
        }
      }
      for (const a of action.actions) {
        const abort = await runAction(subCtx, a);
        // An optional head action may decline while a mandatory conditional tail still
        // resolves (BT25-077: optional suspend, then mandatory deletion when the event
        // entered by effect). In that case the once-per-turn activation was consumed;
        // preserve the decline only when the tail's condition also fails.
        if (subCtx.oncePerTurnActivationDeclined && !a.optional && subCtx.lastActionConditionMatched) {
          subCtx.oncePerTurnActivationDeclined = false;
        }
        if (abort) break;
      }
    },
  });
}

/**
 * Grant a triggered effect to a chosen permanent (CAP-C-16, BT21-077).
 *
 * Resolves the target permanent(s) from the action, then installs a SubTrigger watcher
 * anchored on EACH granted permanent so that "this Digimon" / controller scope inside the
 * `gainedActions` body resolve to the GRANTED permanent (not the granter). The watcher fires
 * when `gainedTrigger` matches a live SubTrigger bus event.
 *
 * Duration: `untilOpponentTurnEnd` expires at the end of the granted permanent's controller's
 * own turn (the granter's opponent's turn end = the OPPONENT Digimon owner's turn end).
 * The `expiresOnTurnEndOf` field on the watcher handles the sweep.
 *
 * "StartOfYourMainPhase" maps to `startOfYourMainPhase` via SUBTRIGGER_EVENT_MAP, which is
 * already fired by GameEngine at `OnStartMainPhase`. The `ownerMainPhaseGate` inside the
 * existing SubTrigger machinery restricts it to the granted permanent's owner's phase.
 */
export async function runGainTriggeredEffect(
  ctx: EffectContext,
  action: Extract<Action, { kind: "GainTriggeredEffect" }>,
): Promise<void> {
  const event = SUBTRIGGER_EVENT_MAP[action.gainedTrigger];
  if (event === undefined) {
    unsupported(
      ctx,
      action,
      `GainTriggeredEffect gainedTrigger "${action.gainedTrigger}" is not a known SubTrigger event`,
    );
    return;
  }
  const targetIds = await resolvePermanentTargets(ctx, action.target, { preserveUnaffectableSelection: true });
  const grantingSeat = ctx.source.ownerSeat;
  const grantingKinds = ctx.source.definition.kinds.filter((kind) => kind === "Digimon" || kind === "Option");
  for (const targetPermanentId of targetIds) {
    const grantedPerm = ctx.game.permanentById(targetPermanentId);
    if (grantedPerm === undefined) continue;
    let expiresOnTurnEndOf: typeof ctx.source.ownerSeat | undefined;
    if (action.duration === "forTheTurn") expiresOnTurnEndOf = ctx.source.ownerSeat;
    if (action.duration === "untilYourTurnEnd") expiresOnTurnEndOf = ctx.source.ownerSeat;
    if (action.duration === "untilOpponentTurnEnd") {
      expiresOnTurnEndOf = ctx.game.opponentOf(ctx.source.ownerSeat);
    }
    // `startOfYourMainPhase` requires the watcher to fire only during the GRANTED permanent's
    // owner's main phase; the ownerMainPhaseGate in runSubTrigger handles this via isOwnersTurn()
    // on the watcher's context, which is anchored on the GRANTED permanent. Gate is always added
    const ownerMainPhaseGate =
      event === "startOfYourMainPhase"
        ? (subCtx: EffectContext): boolean => subCtx.source.isOwnersTurn() && subCtx.source.isOnBattleArea()
        : undefined;
    const grantedPermanentDeletionGate =
      event === "onDeletionOf"
        ? (subCtx: EffectContext): boolean => subCtx.trigger.deletedPermanentId === targetPermanentId
        : undefined;
    // A gained "when this Digimon deletes ... in battle" trigger belongs to the
    // granted permanent, not to every attacker controlled by the same player.
    // The combat controller only publishes this event after the attacker survives
    // and the battled defender is deleted, so this identity gate completes the
    // printed condition without duplicating combat semantics here.
    const grantedPermanentBattleDeleteGate =
      event === "whenDeletesInBattle"
        ? (subCtx: EffectContext): boolean => subCtx.trigger.attackerPermanentId === targetPermanentId
      : undefined;
    const whenDeletesInBattleSelfGate =
      event === "whenDeletesInBattle" && sourceFilter?.isSelfRef === true && anchorPermanentId !== undefined
        ? (subCtx: EffectContext): boolean => subCtx.trigger.attackerPermanentId === anchorPermanentId
        : undefined;
    const immunityAtTriggerGate = (subCtx: EffectContext): boolean => {
      const current = subCtx.game.permanentById(targetPermanentId);
      if (current === undefined || current.controllerSeat === grantingSeat) return true;
      if (subCtx.fx.isUnaffectableByOpponentEffects?.(targetPermanentId) === true) return false;
      return !grantingKinds.some((kind) => subCtx.fx.isBeAffectedBySourceKind?.(targetPermanentId, kind) === true);
    };
    const gates = [
      ownerMainPhaseGate,
      grantedPermanentDeletionGate,
      grantedPermanentBattleDeleteGate,
      whenDeletesInBattleSelfGate,
      immunityAtTriggerGate,
    ].filter((g): g is (subCtx: EffectContext) => boolean => g !== undefined);
    const matches = gates.length === 0 ? undefined : (subCtx: EffectContext): boolean => gates.every((g) => g(subCtx));
    const gainedActions = action.gainedActions;
    ctx.fx.subscribeSubTrigger({
      event,
      sourcePermanentId: targetPermanentId,
      once: false,
      ...(matches ? { matches } : {}),
      ...(expiresOnTurnEndOf !== undefined ? { expiresOnTurnEndOf } : {}),
      description: action.raw ?? `GainTriggeredEffect(${action.gainedTrigger}) on ${targetPermanentId}`,
      run: async (subCtx) => {
        for (const a of gainedActions) {
          const abort = await runAction(subCtx, a);
          if (abort) break;
        }
      },
    });
  }
}
