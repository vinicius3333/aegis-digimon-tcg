import {
  CardKind,
  Permanent,
  Zone,
  EffectTiming,
  requireCardDefinition,
  type CardColor,
  nameIncludesToken,
} from "@aegis/shared";
import { pushOnStack, setTopCard } from "../../state/access.js";
import { alternateRequirementAvailable } from "../../actions/digivolve.js";
import {
  matchingEvoCostIgnoringLevel,
  cardHasTrait,
  matchingAlternateDigivolutionRequirement,
} from "../../cards/cardData.js";
import { effectiveKinds } from "../continuous.js";
import { matchingDigivolveCost } from "../verbs/digivolveCost.js";
import { looseZoneOfInstance, peekLooseInstance, removeLooseInstance } from "../verbs/looseInstances.js";

import type { InternalVerbs, PrimitivesContext } from "./context.js";

/**
 * Digivolving onto a permanent from a loose card instance.
 */

export function createDigivolveVerbs(pc: PrimitivesContext) {
  const { engine, access, continuous, ledger, state } = pc;
  // Reached through the context because these are built in sibling modules: the
  // whole set exists before any of it runs, so forwarding at call time is safe.
  const adjustedEvoCost: PrimitivesContext["helpers"]["adjustedEvoCost"] = (...args) =>
    pc.helpers.adjustedEvoCost(...args);
  const draw: InternalVerbs["draw"] = (...args) => pc.fx.draw(...args);

  const digivolveFromInstance = async (
    targetPermanentId: string,
    sourceInstanceId: string,
    opts?: {
      payCost?: boolean;
      draw?: boolean;
      costDelta?: number;
      costOverride?: number;
      useAlternateCost?: boolean;
      ignoreLevel?: boolean;
      virtualBase?: { level: number; colors: CardColor[] };
      ignoreRequirements?: boolean;
      beforeWhenDigivolving?: () => Promise<void>;
      processRulesBeforeWhenDigivolving?: boolean;
      suppressWhenDigivolving?: boolean;
    },
  ): Promise<Permanent | undefined> => {
    const permanent = access.permanentById(targetPermanentId);
    if (permanent === undefined || permanent.topCard === undefined) return undefined;
    const sourceDef = peekLooseInstance(state, sourceInstanceId);
    if (sourceDef === undefined) return undefined;
    const sourceZone = looseZoneOfInstance(state, sourceInstanceId);
    const definition = requireCardDefinition(sourceDef.cardId);
    const seat = permanent.controllerSeat;
    // BT8-059 / KB Q1741-Q1742: a live "players can't ignore digivolution
    // requirements" rule suppresses every effect-driven ignore path, including
    // Critical Arm's same-level Arm swap. Keep this authoritative check here as
    // defense in depth even though the interpreter also removes illegal candidates.
    if (opts?.ignoreRequirements && continuous.cannotIgnoreDigivolution(seat)) {
      return undefined;
    }
    if (opts?.payCost) {
      // ignoreDigivolutionRequirementFixedCost) replaces the printed digivolution cost.
      // `ignoreRequirements` ("ignoring its digivolution requirements") waives the printed
      // color+level gate; without it the base must still satisfy a printed EvoCost (a costOverride
      // alone keeps the requirement — BT7-051).
      let baseCost: number | undefined;
      if (opts.ignoreRequirements) {
        // Ignoring the color/level gate does not waive the card's printed digivolution
        // cost. Effects such as BT26-066 still say "with the cost reduced by 2" and
        // therefore need a real printed baseline. A fixed-cost effect supplies
        // costOverride; otherwise use the cheapest printed evolution cost available on
        // the destination card. Only cards with no printed evolution cost fall back to 0.
        const printedCosts = definition.evoCosts.map(({ memoryCost }) => memoryCost);
        baseCost = opts.costOverride ?? (printedCosts.length > 0 ? Math.min(...printedCosts) : 0);
      } else if (opts.ignoreLevel) {
        const baseDef = requireCardDefinition(permanent.topCard.cardId);
        const printed = matchingEvoCostIgnoringLevel(definition, baseDef);
        const matchedAlternate = matchingAlternateDigivolutionRequirement(definition, baseDef, {
          ignoreLevel: true,
          ...(sourceZone === undefined ? {} : { sourceZone }),
        });
        const alternate =
          matchedAlternate !== undefined && alternateRequirementAvailable(state, seat, permanent, matchedAlternate)
            ? matchedAlternate
            : undefined;
        if (opts.useAlternateCost === true && matchedAlternate !== undefined && alternate === undefined)
          return undefined;
        const useAlternate = alternate !== undefined && (opts.useAlternateCost === true || printed === undefined);
        const matched = useAlternate ? alternate!.cost : (printed?.memoryCost ?? alternate?.cost);
        if (matched === undefined) return undefined;
        baseCost = opts.costOverride ?? matched;
      } else {
        // The base qualifies via a printed EvoCost OR via an alternate digivolution requirement
        // ("[Digivolve] [BurningGreymon]: Cost 0", "onto a red Tamer: Cost 2"). Both carry their
        // own cost. Consulting only the printed EvoCosts rejected every alternate-path base —
        // notably a Tamer base, which has no level and so matches no printed EvoCost at all —
        // and the digivolve then no-opped silently after the controller had already chosen it.
        // `runDigivolve`'s candidate filter already offers alternate-path bases; this is the
        // authoritative gate it claims to mirror, so the two must agree.
        const actualBaseDef = requireCardDefinition(permanent.topCard.cardId);
        const baseDef =
          opts.virtualBase === undefined
            ? actualBaseDef
            : { ...actualBaseDef, level: opts.virtualBase.level, colors: opts.virtualBase.colors };
        const printed = matchingDigivolveCost(definition, baseDef);
        // `virtualBase` replaces the base used for requirement matching. Retaining the
        // original card's Tamer/name/trait identity here would incorrectly admit alternate
        // paths in addition to the stated virtual level and colors.
        const baseGranted =
          opts.virtualBase === undefined
            ? engine.baseGrantedDigivolve?.(seat, permanent, definition, sourceZone)
            : undefined;
        const matchedAlternate =
          opts.virtualBase === undefined
            ? matchingAlternateDigivolutionRequirement(definition, baseDef, {
                ...(sourceZone === undefined ? {} : { sourceZone }),
              })
            : undefined;
        const alternate =
          matchedAlternate !== undefined && alternateRequirementAvailable(state, seat, permanent, matchedAlternate)
            ? matchedAlternate
            : undefined;
        if (opts.useAlternateCost === true && matchedAlternate !== undefined && alternate === undefined)
          return undefined;
        const useAlternate = alternate !== undefined && (opts.useAlternateCost === true || printed === undefined);
        if (useAlternate && alternate.minNameStackNames !== undefined) {
          const required = alternate.minNameStackCount ?? 1;
          const matches = permanent.stack.filter((card) => {
            const stackDef = requireCardDefinition(card.cardId);
            return alternate.minNameStackNames!.some((name) =>
              alternate.minNameStackMatch === "contains"
                ? nameIncludesToken(stackDef.nameEn, name)
                : stackDef.nameEn === name,
            );
          }).length;
          if (matches < required) return undefined;
        }
        if (useAlternate && alternate.minTraitStackCount !== undefined) {
          const wanted = alternate.minTraitStackTraits ?? [];
          const matches = permanent.stack.filter((card) => {
            const stackDef = requireCardDefinition(card.cardId);
            return wanted.some((trait) => cardHasTrait(stackDef, trait));
          }).length;
          if (matches < alternate.minTraitStackCount) return undefined;
        }
        const matched = useAlternate ? alternate!.cost : (printed ?? alternate?.cost ?? baseGranted?.cost);
        if (matched === undefined) return undefined;
        baseCost = opts.costOverride ?? matched;
      }
      // The card-printed folded reduction ("... for its digivolution cost -N") is added ONCE here;
      // the continuous evo-cost ledger (evoCostFor + the wouldDigivolve replacement reduction) is
      // then applied so continuous cost-reductions reach this effect-driven path too (KB BT1-109
      // Q980). Floored at 0 — a digivolution cost can't go below 0.
      const declaredDelta = opts.costDelta ?? 0;
      const allowedDelta = continuous.blocksCostReduction(seat, "digivolve")
        ? Math.max(0, declaredDelta)
        : declaredDelta;
      const declaredCost = baseCost + allowedDelta;
      const cost = Math.max(
        0,
        engine.finalizeEffectDigivolveCost !== undefined
          ? await engine.finalizeEffectDigivolveCost(permanent, sourceInstanceId, definition, declaredCost)
          : adjustedEvoCost(seat, permanent, declaredCost, definition),
      );
      if (engine.memory.maxCostFor(seat) < cost) return undefined;
      if (cost > 0) engine.memory.pay(seat, cost, "digivolve");
    } else if (!opts?.ignoreRequirements) {
      // Cost-free effect-digivolve ("digivolve into X without paying the cost"): the memory cost is
      // waived but the digivolution REQUIREMENT is not. Only an explicit "ignoring its digivolution
      // requirements" (ignoreRequirements) waives the requirement; paying 0 memory does not. The base
      // must still satisfy the into-card's printed EvoCost or an alternate trait/name digivolution
      // requirement. Mirrors the interpreter's candidate filter (runDigivolve enforceRequirements):
      // only gate a base that carries a level — a level-less base (Q4242) satisfies no level-gated
      // requirement, so the check is meaningless and is skipped rather than rejecting the digivolve.
      const baseDef = requireCardDefinition(permanent.topCard.cardId);
      const baseGranted = engine.baseGrantedDigivolve?.(seat, permanent, definition, sourceZone);
      const printed = matchingDigivolveCost(definition, baseDef);
      const matchedAlternate = matchingAlternateDigivolutionRequirement(definition, baseDef, {
        ...(sourceZone === undefined ? {} : { sourceZone }),
      });
      const alternate =
        matchedAlternate !== undefined && alternateRequirementAvailable(state, seat, permanent, matchedAlternate)
          ? matchedAlternate
          : undefined;
      if (printed === undefined && alternate !== undefined && !opts?.ignoreRequirements) {
        if (alternate.minNameStackNames !== undefined) {
          const required = alternate.minNameStackCount ?? 1;
          const matches = permanent.stack.filter((card) => {
            const stackDef = requireCardDefinition(card.cardId);
            return alternate.minNameStackNames!.some((name) =>
              alternate.minNameStackMatch === "contains"
                ? nameIncludesToken(stackDef.nameEn, name)
                : stackDef.nameEn === name,
            );
          }).length;
          if (matches < required) return undefined;
        }
      }
      if (
        baseDef.level !== undefined &&
        printed === undefined &&
        alternate === undefined &&
        baseGranted === undefined
      ) {
        return undefined;
      }
    }
    // ＜Arts Digivolve＞ (CR §4-19): the source may be the DUAL card still resolving as an
    // Option, which this digivolution routes instead of the trash step. Same marker the
    // trash and self-placement routes carry, so the client's resolving-Option dock closes.
    const routesUsedOption = state.players.some((owner) => owner.resolvingOption?.instanceId === sourceInstanceId);
    const instance = removeLooseInstance(state, sourceInstanceId);
    if (instance === undefined) return undefined;
    instance.faceUp = true;
    const carriedSuspended = permanent.isSuspended;
    const priorTop = permanent.topCard;
    const baseWasDigimon = effectiveKinds(
      continuous,
      permanent.permanentId,
      requireCardDefinition(priorTop.cardId).kinds,
    ).includes(CardKind.Digimon);
    pushOnStack(permanent, priorTop);
    setTopCard(permanent, instance);
    // A prior stack rotation may have marked the promoted no-DP top for rule trash.
    // A successful digivolution replaces that top with a new card, so the stale marker
    // must not trash the newly evolved permanent during the post-effect rule pass.
    permanent.invalidNoDpStackTop = false;
    continuous.reanchorCustomEffectGrants(priorTop.instanceId, instance.instanceId);
    const dp = definition.kinds.includes(CardKind.Digimon) ? definition.dp : 0;
    permanent.baseDP = dp;
    permanent.currentDP = dp;
    ledger.recomputeDP(state, permanent.permanentId);
    permanent.isSuspended = carriedSuspended;
    engine.emit({
      kind: "cardsMoved",
      instanceIds: [instance.instanceId],
      from: "various",
      to: Zone.BattleArea,
      ...(routesUsedOption ? { optionUsed: true as const } : {}),
    });
    // This is a real digivolution even though an effect initiated it. Without the
    // semantic event, clients see only an unexplained zone movement followed by a
    // draw and cannot run the digivolution presentation.
    engine.emit({
      kind: "digivolved",
      seat,
      permanentId: permanent.permanentId,
      cardId: instance.cardId,
      ...(instance.artId ? { artId: instance.artId } : {}),
      mechanic: "normal",
      inBreeding: permanent.inBreeding,
    });
    // CR 7-1-4-1: every digivolution draws its digivolution bonus unless a caller
    // explicitly suppresses it. Effect-driven digivolution is still digivolution; making
    // the undefined default false silently skipped the bonus for nearly every card module.
    if (opts?.draw !== false) await draw(seat, 1, { drawReason: "digivolution" });
    await opts?.beforeWhenDigivolving?.();
    if (opts?.processRulesBeforeWhenDigivolving) {
      await engine.processRulesBeforeWhenDigivolving?.();
    }
    // A replacement digivolution can itself be removed by the nested rule check (for
    // example, a newly evolved Digimon still at 0 DP). Its entry timing cannot activate
    // after that physical removal; the outer rule pass retains and orders its reactions.
    if (opts?.processRulesBeforeWhenDigivolving) {
      if (
        access.permanentById(permanent.permanentId) !== permanent ||
        permanent.topCard?.instanceId !== instance.instanceId
      ) {
        return permanent;
      }
    }
    // The digivolved-into card's OWN [When Digivolving] fires (it was digivolved BY AN EFFECT),
    // with `enteredByEffect` set to its controller (the producer for the BT25-084 by-effect gate).
    if (opts?.suppressWhenDigivolving !== true) {
      await engine.fireEnteredByEffect?.(EffectTiming.WhenDigivolving, instance.instanceId, seat, {
        baseWasDigimon,
        ...(sourceZone !== undefined ? { digivolvedFromZone: sourceZone } : {}),
      });
    }
    return permanent;
  };

  /**
   * DNA-digivolve: consume two-or-more material permanents and play `resultInstanceId`
   * as one new permanent carrying every material's top card and digivolution cards
   * beneath it. The materials are removed from the field (their cards become the new
   * permanent's stack). Placed on the first material's controller's side.
   */

  return { digivolveFromInstance };
}
