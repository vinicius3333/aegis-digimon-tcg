// Suspend state, DP, keywords, and moving a permanent.

import { requireOpponentAsk } from "../../../decisions/decisionApi.js";
import type { EffectContext } from "../../EffectContext.js";
import { type ActionScope, runAction } from "../dispatch.js";
import { toDuration } from "../duration.js";
import { ACTION_TYPE_KEYWORDS, unsupported } from "../errors.js";
import { permanentMatchesFilter, seatsForController } from "../matching/permanent.js";
import { countMatching, scaleFactor } from "../scaling.js";
import { candidateLooseInstances, looseCardsInZone, pickLoose } from "../targeting/loose.js";
import { resolvePermanentTargets } from "../targeting/permanents.js";
import { CardKind, getCardDefinition } from "@aegis/shared";
import type { Action, EffectDurationRef, Target, ZoneRef } from "@aegis/shared";

export async function runBoardAction(ctx: EffectContext, action: Action, scope: ActionScope): Promise<boolean> {
  const { scale } = scope;
  switch (action.kind) {
    case "HandManipulation": {
      if (action.amount === "untilFive") {
        for (const seat of [ctx.source.ownerSeat, ctx.game.opponentOf(ctx.source.ownerSeat)] as const) {
          const hand = ctx.game.player(seat).hand;
          const count = Math.max(0, hand.length - 5);
          if (count === 0) continue;
          const target: Target = {
            filter: { zone: "hand", controller: seat === ctx.source.ownerSeat ? "mine" : "opponent" },
            count,
          };
          const candidates = candidateLooseInstances(ctx, target, ["hand"]);
          const chosen = await pickLoose(ctx, target, candidates, undefined, ctx.ask);
          if (chosen.length > 0) await ctx.fx.trash(chosen, { byEffectSeat: ctx.source.ownerSeat });
        }
        return false;
      }
      const count = action.amount === "variable" ? (ctx.trigger.addedToHand?.instanceIds.length ?? 0) : action.amount;
      if (count <= 0) return false;
      const controller = action.controller ?? "mine";
      const target: Target = {
        filter: { zone: "hand", controller },
        count,
        upTo: true,
      };
      const candidates = candidateLooseInstances(ctx, target, ["hand"]);
      // See TrashAction.chooser: "your opponent trashes cards in their hand equal to..."
      // (BT10-077) is the opponent's own discard, not the controller reaching into it.
      const asker = action.chooser === "opponent" ? requireOpponentAsk(ctx) : ctx.ask;
      const chosen = await pickLoose(ctx, target, candidates, undefined, asker);
      if (chosen.length > 0) await ctx.fx.trash(chosen, { byEffectSeat: ctx.source.ownerSeat });
      return false;
    }
    case "Suspend": {
      // "For each one, suspend 1 ..." (EX6-060): a scale factor (the paid count of an
      // up-to cost, or a "for each" hint) multiplies the target COUNT for this verb.
      const target =
        scale !== undefined && typeof action.target.count === "number"
          ? { ...action.target, count: action.target.count * scale }
          : action.target;
      const ids = await resolvePermanentTargets(ctx, target);
      const suspendResult =
        ids.length > 0
          ? await ctx.fx.suspend(ids, { byEffectSeat: ctx.source.ownerSeat, byEffectCardId: ctx.source.cardId })
          : [];
      // The primitive owns transition legality (already suspended, restrictions). Effects
      // whose text says "suspend ... If you did" must key off the permanents that really
      // changed orientation, not merely the candidates selected by the player.
      const suspendedIds = suspendResult;
      if ((action as { preventUnsuspend?: string }).preventUnsuspend === "opponentNextUnsuspendPhase") {
        // This continuation applies to the chosen Digimon even when it was already suspended.
        // The printed "that Digimon doesn't unsuspend" still resolves in that state (EX4-013,
        // Q3451); only "if this effect suspended" conditions use the transition receipt.
        for (const id of ids) {
          ctx.fx.restrict(id, "unsuspend", toDuration("untilOpponentNextUnsuspendPhase"));
        }
      }
      ctx.lastSuspendedPermanentIds = suspendedIds;
      // `suspend()` may open nested trigger windows whose target resolution mutates the
      // shared context. Rebind sameTarget AFTER those windows finish, using the primitive's
      // transition receipt rather than the pre-action selection. This keeps continuations
      // such as Samādhi Śānti's "that Digimon/Tamer can't unsuspend" attached to the card
      // this effect actually suspended, and to nothing when suspension did not occur.
      // `sameTarget` refers to the permanent selected by the preceding action, even when the
      // requested transition was already true (EX9-038 Q4792). Keep the actual transition
      // receipt in `lastSuspendedPermanentIds` for conditions/scaling that require it.
      ctx.lastResolvedPermanentIds = ids;
      ctx.lastEffectActed = suspendedIds.length > 0;
      // Bind "the Digimon this effect suspended" so a later action can reference exactly the
      // permanents that were suspended (empty when 0 resolved — KB Q4791/Q4792 edge case).
      if (action.bindResultAs) {
        ctx.boundPlayed ??= new Map();
        ctx.boundPlayed.set(action.bindResultAs, new Set(suspendedIds));
      }
      if (ids.length > 0 && action.target.bindAs !== undefined) {
        ctx.selections ??= new Map();
        ctx.selections.set(action.target.bindAs, ids[0]!);
      }
      // When `trackCount` is present, store the actual suspended count so a subsequent
      // RepeatPerCount action can loop that many times (BT2-041, KB Q1014).
      if (action.trackCount !== undefined) {
        if (ctx.namedCounts === undefined) ctx.namedCounts = new Map();
        ctx.namedCounts.set(action.trackCount, suspendedIds.length);
      }
      return action.abortOnDecline === true && suspendedIds.length === 0;
    }
    case "Unsuspend": {
      // "Unsuspend 1" can only act on a suspended permanent. Excluding already-active
      // candidates before the prompt prevents an automatic or human selection from
      // wasting the effect on a card whose orientation cannot change (BT15-063).
      const ids = await resolvePermanentTargets(ctx, action.target, {
        eligible: (permanentId) => ctx.game.permanentById(permanentId)?.isSuspended === true,
      });
      if (ids.length > 0) {
        await ctx.fx.unsuspend(ids);
        if (action.target.bindAs !== undefined) {
          ctx.selections ??= new Map();
          ctx.selections.set(action.target.bindAs, ids[0]!);
        }
      }
      // Publish the actual transition target for same-target continuations such as
      // BT8-081's "unsuspend it and it gets +3000 DP" pair.
      ctx.lastResolvedPermanentIds = ids;
      return false;
    }
    case "RepeatPerCount": {
      // Loop the nested action once per count stored under `countSource` (BT2-041).
      // KB Q1014: each iteration is a separate activation with its own fresh target
      // selection. KB Q1015: all activations share the same timing priority window.
      const repeatCount =
        action.countScaling !== undefined
          ? scaleFactor(ctx, action.countScaling)
          : action.countFilter !== undefined
            ? countMatching(ctx, action.countFilter)
            : (ctx.namedCounts?.get(action.countSource) ?? 0);
      for (let i = 0; i < repeatCount; i++) {
        await runAction(ctx, action.action);
      }
      return false;
    }
    case "MovePermanent": {
      if (action.direction === "toBreeding") {
        // Self moves into the empty breeding slot (P-143 [End of Your Turn]).
        const self = ctx.source.permanent();
        if (self) await ctx.fx.movePermanentZone(self.permanentId, "toBreeding");
        return false;
      }
      // toBattle: move the controller's lone breeding-area Digimon to the battle area
      // (P-130 [On Play]). Breeding is single-occupancy, so the eligible permanent is the
      // owner's breeding slot when it meets the target filter (your Digimon, level ≥ 3).
      const owner = ctx.game.player(ctx.source.ownerSeat);
      const bred = owner.breeding;
      if (bred === undefined || bred.topCard === undefined) return false;
      // Q4242: a Lv.- Digimon (no level) cannot be referenced by level — not eligible.
      if (ctx.game.definitionOf(bred.topCard).level === undefined) return false;
      if (action.target && !permanentMatchesFilter(ctx, bred, action.target.filter, ctx.source)) {
        return false;
      }
      await ctx.fx.movePermanentZone(bred.permanentId, "toBattle");
      return false;
    }
    case "Hatch": {
      // "Hatch a Digi-Egg" into the controller's empty breeding slot (BT8-091 [On Play]).
      // The primitive no-ops when the Digi-Egg deck is empty or the breeding slot is
      // occupied (Comprehensive Rules §4-17/§6-4) — a faithful no-op, not a loud gap.
      ctx.fx.hatch(ctx.source.ownerSeat);
      return false;
    }
    case "ModifyDP": {
      const nextOpponentTurnDuration = action.duration === "untilOpponentNextTurnEnd";
      const targetUsesBudget =
        action.target.totalDpCap !== undefined ||
        action.target.totalDpCapFromSourceDp === true ||
        action.target.totalPlayCostBudget !== undefined ||
        action.target.totalPlayCostBudgetFromSelectionRef !== undefined ||
        action.target.totalLevels !== undefined;
      if (
        nextOpponentTurnDuration &&
        action.playerWide !== true &&
        ((action.alsoGainKeywords?.length ?? 0) > 0 ||
          action.continuous === true ||
          ctx.continuousPass === true ||
          action.target.count !== 1 ||
          action.target.countModifier !== undefined ||
          targetUsesBudget)
      ) {
        unsupported(ctx, action, '"untilOpponentNextTurnEnd" is supported only for one-shot single-target DP');
        return false;
      }
      if (action.playerWide === true) {
        const controller = action.target.filter.controller;
        if (controller !== "mine" && controller !== "opponent") return false;
        const seat = controller === "mine" ? ctx.source.ownerSeat : ctx.game.opponentOf(ctx.source.ownerSeat);
        const amount = scale === undefined ? action.amount : action.amount * scale;
        if (amount !== 0) {
          ctx.fx.modifyPlayerDP(
            seat,
            amount,
            nextOpponentTurnDuration ? toDuration("untilOpponentTurnEnd") : toDuration(action.duration),
            nextOpponentTurnDuration
              ? {
                  ownerSeat: ctx.source.ownerSeat,
                  skipsCurrentOpponentTurnEnd: !ctx.source.isOwnersTurn(),
                }
              : undefined,
          );
        }
        return false;
      }
      const ids = await resolvePermanentTargets(ctx, action.target);
      if (nextOpponentTurnDuration && ids.length > 1) {
        unsupported(ctx, action, '"untilOpponentNextTurnEnd" resolved more than one DP target');
        return false;
      }
      const skipsCurrentOpponentTurnEnd = nextOpponentTurnDuration && !ctx.source.isOwnersTurn();
      const duration = nextOpponentTurnDuration ? toDuration("untilOpponentTurnEnd") : toDuration(action.duration);
      const effectSourceBound = (action as Action & { effectSourceBound?: boolean }).effectSourceBound === true;
      for (const id of ids) {
        const targetScale =
          action.scaling?.unit === "targetFaceDownDigivolutionCards"
            ? Math.floor(
                (ctx.game.permanentById(id)?.stack.filter((card) => card.faceUp !== true).length ?? 0) /
                  Math.max(1, action.scaling.per),
              )
            : scale;
        const amount = targetScale === undefined ? action.amount : action.amount * targetScale;
        if (amount === 0) continue;
        ctx.fx.modifyDP(
          id,
          amount,
          duration,
          action.continuous === undefined
            ? ctx.continuousPass === true
              ? { continuous: true, ...(effectSourceBound ? { sourceInstanceId: ctx.source.instanceId } : {}) }
              : effectSourceBound
                ? { sourceInstanceId: ctx.source.instanceId, skipsCurrentOpponentTurnEnd }
                : { skipsCurrentOpponentTurnEnd }
            : {
                continuous: action.continuous,
                skipsCurrentOpponentTurnEnd,
                ...(effectSourceBound ? { sourceInstanceId: ctx.source.instanceId } : {}),
              },
        );
        for (const keyword of action.alsoGainKeywords ?? []) {
          ctx.fx.grantKeyword(id, keyword.keyword, duration, keyword.amount);
        }
      }
      if (ids.length > 0 && action.target.bindAs !== undefined) {
        ctx.selections ??= new Map();
        ctx.selections.set(action.target.bindAs, ids[0]!);
      }
      return false;
    }
    case "AddDPFromSuspendedCost": {
      // payCost() has already selected and suspended the cost target, recording the
      // exact permanent id(s) in this resolution's context. Use the live DP after
      // payment, then apply the attack-scoped delta and keyword grants to the effect
      // target. This keeps the cost selection and the DP source bound together.
      const suspendedIds = ctx.lastSuspendedPermanentIds ?? [];
      if (suspendedIds.length === 0) return action.abortOnDecline === true;
      const amount = suspendedIds.reduce((total, id) => total + (ctx.game.permanentById(id)?.currentDP ?? 0), 0);
      const targetIds = await resolvePermanentTargets(ctx, action.target);
      if (targetIds.length === 0) return false;
      const duration = toDuration(action.duration);
      for (const id of targetIds) {
        ctx.fx.modifyDP(id, amount, duration);
        for (const keyword of action.alsoGainKeywords ?? []) {
          ctx.fx.grantKeyword(id, keyword.keyword, duration, keyword.amount);
        }
      }
      return false;
    }
    case "AddDPFromTrashedCard": {
      const amount = (ctx.lastTrashedCards ?? []).reduce((total, card) => total + card.dp, 0);
      if (amount === 0) return false;
      const targetIds = await resolvePermanentTargets(ctx, action.target);
      for (const id of targetIds) {
        ctx.fx.modifyDP(id, amount, toDuration(action.duration), { sourceInstanceId: ctx.source.instanceId });
      }
      return false;
    }
    case "SetBaseDP": {
      const ids = await resolvePermanentTargets(ctx, action.target);
      const duration = toDuration(action.duration);
      for (const id of ids) ctx.fx.setBaseDP(id, action.value, duration);
      return false;
    }
    case "GainKeyword": {
      const keyword = action.keyword ?? action.keywords?.[0];
      if (keyword === undefined || typeof keyword !== "object") {
        unsupported(ctx, action, "GainKeyword is missing its keyword specification");
        return false;
      }
      const kw = keyword.keyword;
      const duration = toDuration(action.duration);
      if (action.playerWide === true) {
        const seat =
          action.target.filter.controller === "opponent"
            ? ctx.game.opponentOf(ctx.source.ownerSeat)
            : ctx.source.ownerSeat;
        ctx.fx.grantPlayerKeyword(seat, kw, duration, keyword.amount);
        // A player-wide grant is an activated effect even when no matching permanent is
        // currently present; its ledger entry applies to qualifying permanents entering later.
        // Preserve that result for a following "if you did" clause (BT9-102).
        ctx.lastEffectActed = true;
        return false;
      }
      // A keyword backed by the continuous ledger is attached even while the recipient is
      // immune to the granting effect; immunity suppresses it at the consume site and it
      // becomes live if immunity lapses (CR 15-15-5, BT26-047 Q7046-Q7049). Immediate
      // action-keywords and the dedicated Piercing/Link stores keep ordinary filtering until
      // those stores can retain equivalent source provenance.
      const ids = await resolvePermanentTargets(ctx, action.target, {
        preserveUnaffectableSelection:
          !ACTION_TYPE_KEYWORDS.has(kw) && kw !== "Piercing" && kw !== "Link" && kw !== "LinkMax",
      });
      if (ids.length > 0 && action.target.bindAs !== undefined) {
        ctx.selections ??= new Map();
        ctx.selections.set(action.target.bindAs, ids[0]!);
      }
      const grantProvenance = {
        sourceSeat: ctx.source.ownerSeat,
        sourceKinds: [...ctx.source.definition.kinds],
      };
      // Follow-up clauses such as EX12-015's "that Digimon ... attacks" gate on whether
      // this optional grant actually chose a recipient. Preserve that outcome explicitly;
      // resolvePermanentTargets already binds the same physical recipient for sameTarget.
      ctx.lastEffectActed = ids.length > 0;
      if (action.includeLaterEntrants === true) {
        const grantedPermanentIds = new Set(ids);
        const expiresOnTurnEndOf =
          action.duration === "forTheTurn" || action.duration === "untilYourTurnEnd"
            ? ctx.source.ownerSeat
            : action.duration === "untilOpponentTurnEnd" || action.duration === "endOfOpponentTurn"
              ? ctx.game.opponentOf(ctx.source.ownerSeat)
              : undefined;
        ctx.fx.subscribeSubTrigger({
          event: "onEnterFieldAnyone",
          activationContext: ctx,
          once: false,
          ...(expiresOnTurnEndOf === undefined ? {} : { expiresOnTurnEndOf }),
          description: `GainKeyword later entrant from ${ctx.source.cardId}`,
          matches: (subCtx) => {
            const id = subCtx.trigger.subjectPermanentId;
            const permanent = id === undefined ? undefined : subCtx.game.permanentById(id);
            return (
              permanent !== undefined && permanentMatchesFilter(subCtx, permanent, action.target.filter, subCtx.source)
            );
          },
          run: async (subCtx) => {
            const id = subCtx.trigger.subjectPermanentId;
            const permanent = id === undefined ? undefined : subCtx.game.permanentById(id);
            const top = permanent?.topCard;
            if (permanent === undefined || top === undefined || grantedPermanentIds.has(permanent.permanentId)) return;
            const futureGrantCount = action.count ?? 1;
            const futureGrantProvenance = {
              sourceSeat: subCtx.source.ownerSeat,
              sourceKinds: [...subCtx.source.definition.kinds],
              sourceCardId: subCtx.source.cardId,
              sourceEffectText: subCtx.activeEffectText,
            };
            for (let i = 0; i < futureGrantCount; i++) {
              subCtx.fx.grantKeyword(
                permanent.permanentId,
                kw,
                toDuration(action.duration),
                keyword.amount,
                futureGrantProvenance,
              );
            }
            grantedPermanentIds.add(permanent.permanentId);
          },
        });
        // A successful cost-bearing grant is still an activated effect when the filtered board
        // target is empty; its later-entrant watcher is the live recipient. This matters for the
        // immediately following BT9-102 "you did" named-effect grant.
        if (ids.length === 0) ctx.lastEffectActed = true;
      }
      // ＜Piercing＞ has a dedicated pierce store; every other CONTINUOUS keyword
      // ability is recorded in the continuous-effect ledger (real server state the
      // combat / keyword-abilities subsystem reads). ACTION-type keywords (those that
      // carry out a verb when gained — De-Digivolve, Digi-Burst, Recovery, ...) have
      // no continuous representation and remain loud gaps until their verb is wired.
      if (kw === "Piercing") {
        for (const id of ids) ctx.fx.grantPierce(id, duration, { continuous: ctx.activeTiming === "Static" });
        return false;
      }
      if (kw === "Link" || kw === "LinkMax") {
        // The catalog uses "Link" for the printed ＜Link +N＞ keyword while hand-authored
        // effects use the runtime ledger name "LinkMax". Both spellings raise the limit.
        // Recorded in the continuous ledger; `linkMax` (mindLink.ts) sums it on the base 1.
        const delta = keyword.amount ?? 1;
        for (const id of ids) ctx.fx.grantLinkMax(id, delta, duration);
        for (const extra of action.keywords ?? []) {
          for (const id of ids) ctx.fx.grantKeyword(id, extra.keyword, duration, extra.amount, grantProvenance);
        }
        return false;
      }
      if (ACTION_TYPE_KEYWORDS.has(kw)) {
        // Action-type keywords carry out a VERB when gained, not a continuous ability.
        if (kw === "Recovery") {
          // ＜Recovery +N (Deck)＞: place the top N of your deck onto your security.
          await ctx.fx.recoverToSecurity(ctx.source.ownerSeat, keyword.amount ?? 1);
          return false;
        }
        if (kw === "DeDigivolve") {
          // ＜De-Digivolve N＞ on a target (the verb form). Targets resolved above. The trashing
          // effect's seat gates EX11-070's stacked-trash-lock (KB Q5943: an opponent <De-Digivolve>
          // can't strip a locked host's sources).
          for (const id of ids) ctx.fx.deDigivolve(id, keyword.amount ?? 1, { byEffectSeat: ctx.source.ownerSeat });
          return false;
        }
        if (kw === "Draw") {
          // runtime record mis-encodes <Draw N> as GainKeyword on some cards (e.g. BT22-079).
          // Treat it as the draw verb until the runtime record is fixed.
          await ctx.fx.draw(ctx.source.ownerSeat, keyword.amount ?? 1);
          return false;
        }
        unsupported(ctx, action, `grant action-keyword ＜${kw}＞ needs its verb wired`);
        return false;
      }
      // A Security effect that says "all of your Digimon gain ..." also applies
      // to Digimon played after the security effect resolves. Model that as a
      // player-scoped grant, rather than snapshotting only the permanents that
      // existed when the security card was revealed (ST1-13 / KB Q607).
      if (
        ((action as Action & { playerScoped?: boolean }).playerScoped === true ||
          ctx.trigger.securityInstanceId !== undefined ||
          (ctx.activeTiming === "Security" &&
            (action.target?.filter?.controller === "mine" || action.target?.filter?.controllerDefault === "mine"))) &&
        kw === "SecurityAttack" &&
        action.target?.count === "all" &&
        action.target.filter.kind?.includes("Digimon")
      ) {
        const playerScopedController = (action as Action & { playerScopedController?: "mine" | "opponent" })
          .playerScopedController;
        const playerSeat =
          playerScopedController === "opponent" ? ctx.game.opponentOf(ctx.source.ownerSeat) : ctx.source.ownerSeat;
        ctx.fx.grantPlayerKeyword(playerSeat, kw, duration, keyword.amount);
        return false;
      }
      // `count` grants the keyword N times to each target (default 1). Each call to
      // grantKeyword adds a separate entry in the continuous ledger so that Alliance ×2
      // produces two grants — the consuming side sums each Alliance entry as one extra
      // security check (KB Q3163, BT19-091: "gains <Alliance> twice").
      const grantCount = action.count ?? 1;
      const keywordAmount = scale === undefined ? keyword.amount : (keyword.amount ?? 1) * scale;
      for (const id of ids) {
        for (let i = 0; i < grantCount; i++) {
          const active =
            action.whileMatchesTargetFilter === true
              ? () => {
                  const permanent = ctx.game.permanentById(id);
                  return (
                    permanent !== undefined && permanentMatchesFilter(ctx, permanent, action.target.filter, ctx.source)
                  );
                }
              : undefined;
          ctx.fx.grantKeyword(id, kw, duration, keywordAmount, {
            ...(active === undefined ? {} : { active }),
            sourceCardId: ctx.source.cardId,
            sourceEffectText: ctx.activeEffectText,
            ...grantProvenance,
          });
        }
        // A gained ＜Execute＞ is behavioral, not merely a keyword label. Printed Execute on a
        // card's own top instance is synthesized by module registration; an inherited or
        // externally granted Execute instead installs the same two timing effects on the host.
        if (kw === "Execute") {
          const top = ctx.game.permanentById(id)?.topCard;
          if (top !== undefined && top.instanceId !== ctx.source.instanceId) {
            ctx.fx.grantCustomEffect?.(top.instanceId, top.ownerSeat, "Execute", duration);
          }
        }
      }
      for (const extra of action.keywords ?? []) {
        if (extra.keyword === kw) continue;
        for (const id of ids) {
          if (extra.keyword === "Piercing") ctx.fx.grantPierce(id, duration);
          else ctx.fx.grantKeyword(id, extra.keyword, duration, extra.amount, grantProvenance);
        }
      }
      // Some generated cards attach a second continuous grant to a keyword action. The legacy
      // shape used by BT24-028 is `additionalEffect: { kind: "GrantStatic", modifier:
      // "cannotBeDeletedInBattle" }`; apply it to the same resolved targets after the placement
      // cost has succeeded, so the protection is not installed on a declined cost.
      const additionalEffect = (
        action as typeof action & {
          additionalEffect?: { kind?: string; modifier?: string; duration?: EffectDurationRef };
        }
      ).additionalEffect;
      if (additionalEffect?.kind === "GrantStatic" && additionalEffect.modifier === "cannotBeDeletedInBattle") {
        const protectionDuration = toDuration(additionalEffect.duration ?? action.duration ?? "untilOpponentTurnEnd");
        for (const id of ids) ctx.fx.restrict(id, "beDeletedInBattle", protectionDuration);
      }
      // A following action may say "that Digimon" and resolve through fromSelectionRef.
      // GainKeyword already owns the target choice, so preserve the chosen identity just as
      // ModifyDP and the other target-selecting primitives do.
      if (ids.length > 0 && action.target.bindAs !== undefined) {
        ctx.selections ??= new Map();
        ctx.selections.set(action.target.bindAs, ids[0]!);
      }
      return false;
    }
    case "AddToHandSelf": {
      // "Add this card to its owner's hand" — the card is a security card.
      await ctx.fx.returnToHand([ctx.source.instanceId]);
      return false;
    }
    case "PlaceInBattleAreaSelf": {
      // "Place this card in the battle area" — self-placement of the resolving card.
      // An Option (the ＜Delay＞ "Then, place this card in the battle area" tail and
      // the matching [Security] effect) becomes an option PERMANENT (source
      // the effect runtime.PlaceDelayOptionCards), located wherever it currently sits
      // (trash mid-[Main] resolution, security mid-check). A Digimon/Tamer self-place
      // only occurs from a [Security] effect, so it plays out of security (free).
      // Kind routing is a static card fact: prefer the shared card table (the
      // context's source definition may be a test fixture), falling back for
      // synthetic ids.
      if (action.target !== undefined) {
        const zones = action.target.from ?? action.target.source ?? action.target.zone ?? "hand";
        const zoneList = (Array.isArray(zones) ? zones : [zones]) as ZoneRef[];
        const candidates = candidateLooseInstances(ctx, action.target, zoneList);
        const visible = seatsForController(ctx, action.target.filter)
          .flatMap((seat) => zoneList.flatMap((zone) => looseCardsInZone(ctx, seat, zone)))
          .map((candidate) => candidate.instanceId);
        const chosen = await pickLoose(ctx, action.target, candidates, undefined, ctx.ask, visible);
        for (const instanceId of chosen) await ctx.fx.placeOptionAsPermanent?.(instanceId);
        ctx.lastEffectActed = chosen.length > 0;
        return false;
      }
      const selfKinds = getCardDefinition(ctx.source.cardId)?.kinds ?? ctx.source.definition.kinds;
      if (selfKinds.includes(CardKind.Option)) {
        await ctx.fx.placeOptionAsPermanent?.(ctx.source.instanceId);
      } else {
        if (ctx.fx.isPlayProhibited?.(ctx.source.ownerSeat, ctx.source.cardId, "play") === true) {
          return false;
        }
        await ctx.fx.playFromSecurity(ctx.source.instanceId, { payCost: false });
      }
      return false;
    }
    default:
      // Unreachable: runAction routes only this family's kinds here, and its own default
      // reports anything the Action union does not cover.
      return false;
  }
}
