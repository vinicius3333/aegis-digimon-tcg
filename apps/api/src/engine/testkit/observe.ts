import { getCardDefinition, type Permanent, type Seat } from "@aegis/shared";
import type { GameEngine } from "../GameEngine.js";
import type { Restriction, SubTriggerEventName } from "../effects/EffectContext.js";
import { internalsOf } from "./internals.js";
import { attackedWithDigimonInCurrentOrPreviousTurn } from "../turnActivity.js";
import { effectiveColors, effectiveNames } from "../effects/continuous.js";

/**
 * Named reads over engine state a test cannot see from synced state alone — continuous
 * grants, restrictions and the SubTrigger bus.
 *
 * These exist so assertions name what they mean ("is this permanent restricted from
 * attacking?") instead of reaching into a ledger. If an assertion you need is missing,
 * add it here rather than reaching through: the affordance is the interface, and naming it
 * once makes it available to every suite.
 */
export function observe(engine: GameEngine) {
  const internals = internalsOf(engine);
  return {
    /** Continuous restrictions currently applying to a permanent. */
    isRestricted(permanent: Permanent | string, restriction: Restriction): boolean {
      return internals.continuous.hasRestriction(idOf(permanent), restriction);
    },

    /** Whether a keyword is active on a permanent (printed or continuously granted). */
    hasKeyword(permanent: Permanent | string, keyword: string): boolean {
      return internals.continuous.hasKeyword(idOf(permanent), keyword);
    },

    /** Sum of active continuous grants for a numeric keyword such as Security Attack. */
    keywordAmount(permanent: Permanent | string, keyword: string): number {
      return internals.continuous
        .grantedKeywords(idOf(permanent))
        .filter((grant) => grant.keyword === keyword)
        .reduce((sum, grant) => sum + (grant.amount ?? 0), 0);
    },

    /** Whether a temporary Piercing grant is active on a permanent. */
    hasPierce(permanent: Permanent | string): boolean {
      return internals.modifiers.hasPierce(idOf(permanent));
    },

    /** Active security-battle DP modifier for a player's Security Digimon. */
    securityDp(seat: Seat): number {
      return internals.securityDp.deltaFor(seat);
    },

    /** Whether this attacker currently suppresses the named card's Security effect. */
    suppressesSecurityEffect(permanent: Permanent | string, securityCardId: string): boolean {
      const definition = getCardDefinition(securityCardId);
      return definition !== undefined && internals.continuous.isSecurityEffectDisabled(idOf(permanent), definition);
    },

    /** Whether the named timing window is currently suppressed on a permanent. */
    timingEffectDisabled(
      permanent: Permanent | string,
      timing: "whenDigivolving" | "whenAttacking" | "onPlay",
    ): boolean {
      return internals.continuous.isTimingEffectDisabled(idOf(permanent), timing);
    },

    /** Names granted to a permanent by continuous effects. */
    grantedNames(permanent: Permanent | string): string[] {
      return internals.continuous.grantedNames(idOf(permanent));
    },

    effectiveNames(permanent: Permanent): string[] {
      const printed = permanent.topCard === undefined ? "" : getCardDefinition(permanent.topCard.cardId)?.nameEn ?? "";
      return effectiveNames(internals.continuous, permanent, printed);
    },

    effectiveColors(permanent: Permanent): string[] {
      const printed = permanent.topCard === undefined ? [] : getCardDefinition(permanent.topCard.cardId)?.colors ?? [];
      return effectiveColors(internals.continuous, permanent.permanentId, printed);
    },

    /**
     * Custom effect grants (activatable effects conferred by another card). Grants anchor on
     * the granted card's TOP-CARD instance, so pass a permanent to filter by its top card.
     */
    customEffectGrants(permanent?: Permanent) {
      const grants = internals.continuous.listCustomEffectGrants();
      if (permanent === undefined) return grants;
      return grants.filter((grant) => grant.instanceId === permanent.topCard?.instanceId);
    },

    /** The permanent's Link maximum after continuous grants. */
    linkMaxDelta(permanent: Permanent | string): number {
      return internals.continuous.linkMaxDelta(idOf(permanent));
    },

    /** SubTrigger subscriptions armed for an event, optionally scoped to one source. */
    subscriptions(event: SubTriggerEventName, sourcePermanentId?: string) {
      return internals.subTriggers.subscriptionsFor(event, sourcePermanentId);
    },

    /** Digivolve-cost reduction the SubTrigger bus offers for a seat. */
    costReduction(...args: Parameters<typeof internals.subTriggers.costReductionFor>) {
      return internals.subTriggers.costReductionFor(...args);
    },

    /** The activatable-effect payload the client would see for a permanent. */
    activatableEffects(permanent: Permanent): unknown {
      internals.syncActivatableEffects();
      return permanent.activatableEffectsJson === "" ? [] : JSON.parse(permanent.activatableEffectsJson);
    },

    /** Whether the permanent is still recorded as having attacked during the current turn. */
    hasAttackedThisTurn(permanent: Permanent | string): boolean {
      return internals.combat.attackedThisTurn.has(idOf(permanent));
    },

    /** Whether a seat declared a Digimon attack in the current or just-finished turn window. */
    attackedWithDigimonThisTurn(seat: Seat): boolean {
      return attackedWithDigimonInCurrentOrPreviousTurn(internals.state, seat);
    },

    /** Whether an attack is still resolving through its timing, battle, and cleanup windows. */
    isAttacking(): boolean {
      return internals.combat.isAttacking;
    },

    /** Whether a positive effect currently lets this Digimon attack unsuspended Digimon. */
    canAttackUnsuspended(permanent: Permanent | string): boolean {
      return internals.continuous.canAttackUnsuspended(idOf(permanent));
    },

    /** The seat currently holding an open block window, if any. */
    blockingSeat(): Seat | undefined {
      return internals.combat.blockingSeat;
    },

    /** Whether an effect of the given card kind may grant memory to a seat. */
    canGainMemoryFromEffect(seat: Seat, sourceKinds: string[]): boolean {
      return internals.continuous.canGainMemoryFromEffect(seat, {
        definition: { kinds: sourceKinds } as never,
      });
    },

    /** Whether a permanent currently carries a named continuous restriction. */
    hasRestriction(permanent: Permanent | string, restriction: Restriction, sourceKind?: string): boolean {
      return internals.continuous.hasRestriction(idOf(permanent), restriction, sourceKind);
    },
  };
}

function idOf(permanent: Permanent | string): string {
  return typeof permanent === "string" ? permanent : permanent.permanentId;
}
