import type { CardInstance, EffectTiming, Seat } from "@aegis/shared";
import type { EffectContext } from "../effectContext.js";
import type { RemovalCause } from "../triggers.js";

/**
 * Taking cards off the board or out of a zone: trash, delete, return, suspend
 * and the effect-firing seams those removals go through.
 */
export interface RemovalPrimitives {
  /**
   * Trash loose card instances. Async because trashing a card that sits as a LINK card fires
   * the whenLinkTrashed SubTrigger (KB EX10-062/EX10-073) — the watcher body is awaited so it
   * sequences before control returns (WR-01). Non-link trashes resolve synchronously-fast.
   */
  trash(instanceIds: string[], opts?: { byEffectSeat?: Seat; byRule?: boolean }): Promise<CardInstance[]>;
  /** Trash a breeding permanent as a whole without treating the move as deletion. */
  trashBreedingPermanent?(seat: Seat, opts?: { byEffectSeat?: Seat }): Promise<CardInstance[]>;
  /**
   * Trash digivolution-stack cards (`instanceIds`) of `hostPermanentId` BY AN EFFECT, firing the
   * whenDigivolutionTrashed SubTrigger once per card actually trashed (carrying the host as the
   * subject so a watcher can gate on "an opponent's Digimon"). This is the genuine effect-trash
   * site (KB P-004 Q4113); a return-to-hand bounce that clears digivolution cards uses a separate
   * path and does NOT fire this. Returns the instances trashed.
   */
  trashDigivolutionCards(
    hostPermanentId: string,
    instanceIds: string[],
    opts?: { byEffectSeat?: Seat; byEffectCardId?: string; isDigiBurst?: boolean },
  ): Promise<CardInstance[]>;
  /**
   * Atomically trash exactly `exactCount` selected digivolution cards across one or more hosts.
   * Every host/card/restriction is validated before any card moves or watcher fires; if any
   * selection is stale, duplicated, missing, or protected, nothing moves and `[]` is returned.
   */
  trashDigivolutionCardsAtomic(
    selections: { hostPermanentId: string; instanceId: string }[],
    exactCount: number,
    opts?: { byEffectSeat?: Seat; byEffectCardId?: string; isDigiBurst?: boolean },
  ): Promise<CardInstance[]>;
  /** Whether this exact stacked card can currently be trashed by an effect. */
  canTrashDigivolutionCard?(instanceId: string): boolean;
  /**
   * Consult active digivolution-card-trash "redirect" replacements (BT10-084 Tactimon; KB
   * Q2002-Q2008) for a trash operation about to target `hostPermanentIds`, BEFORE the specific
   * cards to trash are selected. Every caller that is about to trash digivolution cards "by an
   * effect" from one or more hosts (not a self-paid cost trashing its OWN stack for a keyword
   * like ＜Fragment＞/＜Armor Purge＞) must route the resolved host id(s) through this first and
   * use the RETURNED ids for its top/bottom/choose/amount selection — that ordering is what
   * preserves count and selection semantics across the redirect (see
   * `ReplacementInstallRedirect`'s doc comment). Returns `hostPermanentIds` unchanged when no
   * reaction is installed, not every host is eligible, or the controller declines; returns a
   * single-element array (the redirect target) when accepted — a redirect always collapses the
   * WHOLE operation onto the one reacting Digimon (KB Q2004).
   */
  redirectDigivolutionTrashHosts(hostPermanentIds: string[]): Promise<string[]>;
  /**
   * ＜Armor Purge＞'s cost (Comprehensive Rules §16-19-1): trash this permanent's own current
   * top card, promoting the digivolution card directly beneath it to the new top. Requires
   * >= 1 digivolution card to promote; returns undefined (cost unpayable) otherwise.
   */
  armorPurge(permanentId: string): Promise<CardInstance | undefined>;
  /**
   * ＜Ascension＞'s reaction (Comprehensive Rules §16-43-1): place a card instance already
   * loose in trash at the TOP of its owner's security stack. Returns false when the instance
   * is not currently loose (already moved elsewhere).
   */
  ascendToSecurity(instanceId: string): Promise<boolean>;
  /**
   * ＜Material Save N＞'s reaction (Comprehensive Rules §16-21): when `permanentId` (a Digimon
   * with this keyword) is deleted, place up to N of its own specified DigiXros-requirement
   * digivolution cards under 1 of the controller's Tamers instead of trashing them. Must be
   * called BEFORE the permanent's cards move to trash. Returns true when it fired.
   */
  materialSave(permanentId: string): Promise<boolean>;
  /**
   * Fire the whenOptionUsed SubTrigger ("when you use an Option card's effect"; BT19-040 token
   * watcher). The use-option-without-cost verb lands in 08-06 and calls this at its produce site;
   * the event member + this fire-hook seam are defined in 08-01 so the watcher substrate exists.
   * `usedInstanceId` (the Option whose effect was used) is carried as the subject; `usedOptionCost`
   * (the rules-relevant use cost) lets a watcher gate on "a cost of 2 or more".
   */
  fireOptionUsed(usedInstanceId: string, usedOptionCost?: number): Promise<void>;
  /**
   * Fire the onDiscardLibrary SubTrigger when cards are milled from a player's deck top
   * (BT14-077 Yuki Tamer watcher). The firing seat (whose deck was milled) and the trashed
   * instance IDs are carried so a watcher can gate on "your opponent's deck was milled."
   */
  fireOnDiscardLibrary(deckSeat: Seat, trashedInstanceIds: string[]): Promise<void>;
  /**
   * Fire the whenTrashedFromDeck SubTrigger once per milled card (CAP-H-01, BT19-097).
   * Carries the card ID of the just-trashed deck card so a watcher with sourceFilter.isSelfRef
   * can match only when its own card ID was the one trashed from the deck.
   */
  fireWhenTrashedFromDeck(cardId: string, instanceId?: string, byEffectCardId?: string): Promise<void>;
  /**
   * "Use 1 Option card from your hand" (BT19-040 and 11 other callers). Resolves the used
   * card's [Main]/`OnUseOption` effect (via `resolveCardEffect`) under the CALLING card's
   * control, then trashes the Option (Options resolve then go to trash — they are not
   * permanents) and fires the `whenOptionUsed` SubTrigger (BT19-040 token watcher). Returns
   * the trashed instances. `usedOptionCost` carries the use cost before any payment-only
   * reduction; free-use and reduced-payment effects therefore preserve it.
   */
  useOptionFromHand(
    ctx: EffectContext,
    usedInstanceId: string,
    usedOptionCost?: number,
    opts?: { payCost?: boolean; costDelta?: number; paymentHandled?: boolean },
  ): Promise<CardInstance[]>;
  /**
   * Run `cardId`'s registered EffectModule effect(s) for `timing`, under `ctx.source`'s control
   * (the effect resolves as if the CALLER were doing it — KB precedent: BT19-040 "use 1 Option
   * from hand"). Looks the module up via the shared `registerCard` registry (`registry.ts`), so
   * it works uniformly for a hand-written OR an IR-compiled card — unlike the interpreter's own
   * `getCompiledCard`, which only sees IR-compiled records. Bypasses each effect's own
   * `canActivate`/cost gate and runs every effect `effectsForTiming` returns for `timing` — this
   * verb means "resolve its effect", not "activate it" (the caller has already decided to use the
   * card and paid whatever cost that required). Returns false when `cardId` has no registered
   * module or no effect for `timing` (nothing ran); true otherwise.
   */
  resolveCardEffect(ctx: EffectContext, cardId: string, timing: EffectTiming): Promise<boolean>;
  trashFromSecurity(
    seat: Seat,
    n: number,
    opts?: { fromTop?: boolean; instanceIds?: string[]; cause?: "effect" | "barrierCost" },
  ): Promise<CardInstance[]>;
  /**
   * "By trashing the top security card of 1 player with the most security cards, ...".
   * A player is eligible when they have >=1 security card AND >= the other player's count
   * (a tie leaves BOTH eligible — `controllerSeat` chooses, KB Q6167). The whole thing is
   * OPTIONAL: `controllerSeat` may decline. Returns which seat (if any) was trashed from
   * and the trashed card so the caller can branch on what happened.
   */
  trashTopSecurityOfPlayerWithMostSecurity(controllerSeat: Seat): Promise<{ seat: Seat; trashed: CardInstance[] }>;
  /**
   * Delete permanents from the field; returns the COUNT actually removed (a prevented or
   * deletion-immune permanent contributes 0 — KB BT23-069 Q5338). The interpreter binds this on
   * `ctx.lastDeleteCount` so a subsequent "if this effect didn't delete" Condition can gate.
   */
  deletePermanent(
    permanentIds: string[],
    cause?: RemovalCause,
    opts?: {
      mechanic?: "Overclock";
      turnEndDeletion?: { sourceCardId: string; deletedCardId: string };
      afterMovement?: (deletedPermanentIds: readonly string[]) => void;
    },
  ): Promise<number>;
  /** Trash an invalid battle-area position during a rule check, without deletion semantics. */
  trashPermanentByRule(permanentIds: string[]): Promise<CardInstance[]>;
  /** Returns the permanent IDs that actually transitioned to suspended. */
  suspend(
    permanentIds: string[],
    opts?: {
      byEffectSeat?: Seat;
      byEffectCardId?: string;
      deferTriggers?: boolean;
      suppressWhenEffectSuspends?: boolean;
    },
  ): Promise<string[]>;
  fireSuspensionTriggers?(
    permanentIds: string[],
    opts?: { byEffectSeat?: Seat; byEffectCardId?: string },
  ): Promise<void>;
  unsuspend(permanentIds: string[]): Promise<void>;
  /**
   * Return cards to their owners' hands. Async because a permanent bounce consults the
   * leave-the-battle-area PREVENT reactions first (a "would leave" reaction voids hand
   * bounce too, not just deletion); a prevented permanent is left in play. When
   * `detachPermanentTop` is set, each id names a permanent's visible top card and only that
   * card returns while its underlying stack card is promoted in place.
   *
   * `publicIdentities` names the moved cards on the emitted event. A hand is redacted per
   * seat, so a card whose identity the rules already made public before the move (one taken
   * from a reveal) would otherwise disappear from the opponent's view at the moment it is
   * chosen. Only pass it for cards that are already public; it discloses them to both seats.
   */
  returnToHand(
    instanceIds: string[],
    opts?: { silent?: boolean; byEffectSeat?: Seat; detachPermanentTop?: boolean; publicIdentities?: boolean },
  ): Promise<CardInstance[]>;
  returnToDeck(
    instanceIds: string[],
    opts?: {
      toTop?: boolean;
      byEffectSeat?: Seat;
      byEffectCardId?: string;
      suppressWhenEffectAddsToDeck?: boolean;
    },
  ): Promise<CardInstance[]>;
  /**
   * Return the named top cards of one or more Digimon stacks to their owners' deck tops while
   * preserving each permanent and promoting its highest remaining card. The ids must form a
   * suffix of each complete stack (digivolution cards plus current top), and at least one card
   * is always retained per permanent.
   */
  returnStackTopsToDeck(
    instanceIds: string[],
    opts?: { byEffectSeat?: Seat; byEffectCardId?: string; position?: "top" | "bottom" },
  ): Promise<CardInstance[]>;
  /** Trash up to n current top cards, promoting sources and leaving the bottom card.
   * This is not De-Digivolve: no level-3 floor or De-Digivolve immunity applies. */
  trashStackTops(permanentId: string, n: number, opts?: { byEffectSeat?: Seat }): Promise<CardInstance[]>;
  /** Return loose cards to the bottom of their owners' Digi-Egg decks, face-down. */
  returnToEggDeck?(instanceIds: string[]): Promise<CardInstance[]>;
}
