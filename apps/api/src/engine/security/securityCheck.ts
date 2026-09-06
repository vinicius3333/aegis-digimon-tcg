import {
  EffectTiming,
  Zone,
  type CardInstance,
  type GameState,
  type Permanent,
  type PlayerState,
  type Seat,
  type SecurityBattleResult,
  type ServerEvent,
} from "@aegis/shared";
import { resolveSecurityBattle } from "../combat/resolve.js";
import { extractCardAt, insertCard } from "../state/access.js";
import type { WinCheck } from "./winCheck.js";

/**
 * Security check resolution: the heart of security-and-win-check.
 *
 * Subsystem: security-and-win-check.
 * Source: documented behavior `ISecurityCheck.SecurityCheck()` (the flip-and-resolve
 * loop), documented behavior `IBattle` (battle vs the revealed security Digimon),
 * documented behavior `DetermineAttackOutcome` (the empty-security loss check), and
 * documented behavior `Strike` (how many security cards a single attack checks).
 *
 * Behaviour implemented (presentation UI / animation / coroutine yields stripped):
 *   1. Strike == 0 => no check happens at all.
 *   2. A player-directed attack with Strike >= 1 into EMPTY security => the
 *      attacker's controller wins immediately (loss = "security").
 *   3. Otherwise loop up to `Strike` times while security cards remain:
 *      a. take the top security card (security[0]), reveal it (faceUp = true) and
 *         announce the reveal (`securityRevealed`) before anything it causes,
 *      b. run its [Security] effect, if any (the card is STILL in the security
 *         stack, so a [Security] "play this card" effect can locate it there),
 *      c. fire the OnSecurityCheck trigger,
 *      d. remove it from the security stack (by instanceId; skipped if the
 *         effect already moved it out),
 *      e. fire OnLoseSecurity + whenSecurityRemoved watchers,
 *      f. if the card is still a Security Digimon -> battle the attacker (DP compare),
 *      g. the checked card goes to trash unless an effect relocated it,
 *      h. stop early if the attacker has left play.
 *
 * Step b runs BEFORE step c: Comprehensive Rules 15-16-10-2 — "a triggered [Security]
 * effect will immediately activate without pending activation. Therefore, [Security]
 * effects take precedence for activation even when they trigger simultaneously with
 * other effects" — confirmed by KB Q6085/Q2221.
 *
 * Steps d/e run BEFORE the battle (Comprehensive Rules 13-1-6: "a checked card is
 * removed from the security stack" happens at the check; the battle is the later
 * 13-1-8-3 step). So an attacker deleted BY the battle still fires its
 * whenSecurityRemoved watchers (e.g. BT14-001's inherited ＜Draw 1＞), while one removed
 * by the [Security] effect does not (KB Q2611/Q2629).
 *
 * Known limitation (Comprehensive Rules 13-1-6 + 15-4-3-5): OnSecurityCheck and
 * OnLoseSecurity are one simultaneous trigger set in the rules — the checked card is
 * removed from the stack AS it is checked, so both timings occur at the same point and
 * the turn player orders all of them first. This engine opens the two timing windows in
 * sequence instead, because the resolver's collect/fixpoint is keyed on a single
 * EffectTiming. Consequence: a non-turn-player OnSecurityCheck effect resolves before a
 * turn-player OnLoseSecurity effect. Fixing it needs a multi-timing window in
 * effects/stack.ts, not a change here.
 *
 * The pieces this subsystem does not own — firing the effect stack at a timing
 * window, activating a card's [Security] effect, and the concrete deletePermanent
 * primitive — are injected as `SecurityCheckDeps` so this control flow is complete
 * and testable now, and the real implementations (effect-stack-resolution,
 * effect-framework, effect-primitives) plug in without touching this file.
 */

/** Identifies the attacking permanent for the check (it may leave play mid-check). */
export interface SecurityCheckAttacker {
  permanentId: string;
}

/**
 * What opened the check. A player-directed attack is the only one that can win the game
 * against an empty security stack (Comprehensive Rules 11-5-1-2); ＜Piercing＞ follows a
 * battle against a Digimon and never wins (16-7, and the reference client's
 * `SecurityCards.Count >= 1` guard).
 */
export type SecurityCheckReason = "attack" | "piercing";

/**
 * Ports the security check needs from subsystems it does not own. The engine
 * supplies these; unit tests supply fakes.
 */
export interface SecurityCheckDeps {
  /** Re-derive live auras before deciding whether another check remains. */
  recomputeContinuousEffects?(): Promise<void>;
  /**
   * Security attack count for this attack (documented behavior `Strike`). Base flow is 1;
   * ＜Security Attack +N＞ grants raise it. The engine binds this to a reader summing
   * the attacker's SecurityAttack keyword grants onto the base 1.
   */
  strikeFor(attacker: SecurityCheckAttacker): number;

  /** Live lookup of the attacker permanent, or undefined once it has left play. */
  permanentById(permanentId: string): Permanent | undefined;

  /**
   * Fire the effect stack for a timing window during the check (OnSecurityCheck,
   * OnLoseSecurity). GameEngine binds this to its own resolveTiming.
   */
  fireTiming(
    timing: EffectTiming,
    info: { attackerPermanentId: string; securityInstanceId: string; removedFromSecuritySeat?: Seat },
  ): Promise<void>;

  /**
   * Fire the SubTrigger bus (System B) for security events. Optional so the security unit
   * tests need no change; absent => no watcher runs.
   *   - `whenSecurityRemoved`: fires when a card is removed from a player's security.
   *   - `whenCardTrashedFromSecurity`: fires after a checked card is actually moved to trash,
   *     excluding security effects that relocate it elsewhere.
   *   - `whenCheckedFaceUpSecurity`: fires when the attacker checks a card that was already
   *     face-up in the security stack (BT20-055 CAP-H-03). Carries the attacker's permanent ID
   *     so a watcher knows which Digimon did the check.
   */
  fireSubTrigger?(
    event:
      | "whenSecurityRemoved"
      | "whenCardTrashedFromSecurity"
      | "whenCheckedFaceUpSecurity"
      | "whenSecurityBattleEnded"
      | "whenBattleWon",
    info: {
      attackerPermanentId: string;
      securityInstanceId: string;
      removedFromSecuritySeat?: Seat;
      trashedFromSecurityInstanceIds?: string[];
      subjectPermanentId?: string;
    },
  ): Promise<void>;

  /**
   * Fire `whenFaceUpCardsAddedToOpponentSecurity` for the OTHER half of "a face-up card is
   * added to security" (KB Q5789 binding: a check that flips a face-down card face-up counts
   * as a face-up card being "added", not just an effect-driven security add). Optional so the
   * security unit tests need no change; absent => no watcher runs.
   */
  fireFaceUpSecurityAdded?(info: { seat: Seat; instanceId: string }): Promise<void>;

  /** Capture reveal watchers now; activate them after the immediate [Security] effect. */
  prepareRevealTriggers?(info: {
    attackerPermanentId: string;
    securityInstanceId: string;
    defenderSeat: Seat;
    wasAlreadyFaceUp: boolean;
  }): () => Promise<void>;

  /**
   * Resolve the revealed card's [Security] effect, if any. Returns true when a
   * security effect existed and was resolved. A Digimon still battles afterward unless
   * that effect relocated it out of security. `attackerPermanentId`
   * identifies the attacking permanent so a security-effect disable attached to it
   * (DisableSecurityEffect) can skip the effect while still trashing the card (KB Q886).
   */
  resolveSecurityEffect(card: CardInstance, attackerPermanentId: string, wasFaceUp?: boolean): Promise<boolean>;

  /**
   * Whether the revealed card carries a [Security] effect that would activate now — the
   * same lookup `resolveSecurityEffect` performs, without resolving anything. Published as
   * the `hasSecurityEffect` hint on `securityRevealed` so the client can dock the card at
   * the side of the screen for the whole resolution, the way the reference client does.
   * Optional so the security unit tests need no change; absent => no hint is emitted.
   */
  hasSecurityEffect?(card: CardInstance, attackerPermanentId: string, wasFaceUp?: boolean): boolean;

  /** currentDP of a field permanent (for the battle compare). */
  dpOf(permanentId: string): number;

  /** The revealed security Digimon's DP (CardDefinition.dp). */
  securityCardDp(card: CardInstance): number;

  /** Is the revealed card a Digimon (core: kind Digimon/DigiEgg, faceUp)? */
  isDigimon(card: CardInstance): boolean;

  /**
   * Delete the given field permanents (fires WhenPermanentWouldBeDeleted /
   * OnDestroyedAnyone inside). GameEngine binds this to the real deletePermanent.
   */
  deletePermanents(permanentIds: string[]): Promise<void>;

  /**
   * Whether a permanent has a continuous keyword (e.g. ＜Jamming＞). Optional so
   * the security unit tests need no change; absent => keyword(s) not checked.
   */
  hasKeyword?(permanentId: string, keyword: string): boolean;

  /**
   * Whether a permanent currently carries a continuous restriction — used for the
   * "can't be deleted in battle" grant, which KB LM-003 Q3991 confirms also spares the
   * attacker from a Security Digimon battle. Optional so the security unit tests need no
   * change; absent => the restriction is not checked.
   */
  hasRestriction?(permanentId: string, restriction: "beDeletedInBattle"): boolean;
}

/**
 * Run a security check triggered by a successful player-directed attack.
 *
 * @param defenderSeat the seat whose security is being checked (the attacked player)
 * @param attacker     the attacking permanent
 * @param reason       what opened the check: `"attack"` (a successful player-directed
 *                     attack) or `"piercing"`. Only `"attack"` can win the game on empty
 *                     security — see below.
 * @returns nothing; mutates GameState (security/trash zones) and may end the game
 */
export async function runSecurityCheck(
  state: GameState,
  emit: (event: ServerEvent) => void,
  win: WinCheck,
  deps: SecurityCheckDeps,
  defenderSeat: Seat,
  attacker: SecurityCheckAttacker,
  reason: SecurityCheckReason = "attack",
): Promise<void> {
  const defender: PlayerState | undefined = state.players[defenderSeat];
  if (defender === undefined) return;

  if (deps.strikeFor(attacker) <= 0) return; // Source: `if (AttackingPermanent.Strike == 0) yield break;`

  // Empty security ends the game only for an attack that was successful against the
  // PLAYER (Comprehensive Rules 11-5-1-2 / 1-2-3-1). A ＜Piercing＞ check follows a battle
  // against a Digimon, so the attack was successful against that Digimon, not the player:
  // it checks security but can never win. The reference client guards the same path with
  // `SecurityCards.Count >= 1`.
  if (defender.security.length === 0) {
    if (reason !== "attack") return;
    const attackerPermanent = deps.permanentById(attacker.permanentId);
    if (attackerPermanent) {
      win.declareWinner(attackerPermanent.controllerSeat, "security");
    }
    return;
  }

  let checkedCount = 0;
  // Security checks resolve one card at a time. Re-read the attacker's live Strike
  // before every next card: a resolved Security effect can add/remove
  // ＜Security Attack ±N＞ or De-Digivolve away an inherited grant. Snapshotting the
  // opening value incorrectly performs checks the attacker is no longer allowed to
  // make (P-033 Q4147 and P-068).
  while (true) {
    // A prior check may have removed sources or otherwise changed a conditional
    // Security Attack aura. Refresh both the strike read and the synchronized ledger/UI
    // before deciding whether the next card is checked (BT1-085 Q947).
    await deps.recomputeContinuousEffects?.();
    if (checkedCount >= deps.strikeFor(attacker)) break;
    // Stop if the attacker left play (Source: StopSecurityCheck()).
    if (deps.permanentById(attacker.permanentId) === undefined) break;
    if (defender.security.length === 0) break;
    if (win.isGameOver) break;

    const revealed = defender.security[0];
    if (revealed === undefined) break;

    // A pre-existing face-up security card triggers whenCheckedFaceUpSecurity at the reveal
    // (KB BT20-055: "when your Digimon checks a face-up security card"). Check the flag now,
    // before the reveal sets it, so a face-down card never triggers the event.
    const wasAlreadyFaceUp = revealed.faceUp === true;

    // Reveal the top security card. Source: it becomes face-up during the check.
    revealed.faceUp = true;
    checkedCount += 1;

    // Announce the reveal before anything the revealed card causes. Everything below —
    // the triggers, the [Security] effect and any decision it opens, the battle — is a
    // consequence of this card, and the client cannot present it as one until it has been
    // told which card was flipped. `securityChecked` closes the check with the outcome.
    // Presentation hints, read before anything resolves: whether the card carries a
    // [Security] effect that will activate now (the client docks it at the side of the
    // screen for the whole resolution) and whether it is a Security Digimon (it holds
    // centre-stage for its battle).
    const hints =
      deps.hasSecurityEffect === undefined
        ? {}
        : {
            hasSecurityEffect: deps.hasSecurityEffect(revealed, attacker.permanentId, wasAlreadyFaceUp),
            isDigimon: deps.isDigimon(revealed),
          };
    emit({
      kind: "securityRevealed",
      seat: defenderSeat,
      revealedCardId: revealed.cardId,
      attackerPermanentId: attacker.permanentId,
      ...hints,
    });

    // Freeze eligibility at the reveal so a watcher installed by the [Security] effect
    // cannot react retroactively. Its activation must wait (BT20-005/Q4284).
    const activateRevealTriggers = deps.prepareRevealTriggers?.({
      attackerPermanentId: attacker.permanentId,
      securityInstanceId: revealed.instanceId,
      defenderSeat,
      wasAlreadyFaceUp,
    });

    // Resolve the card's own [Security] effect FIRST — before the triggers this check
    // fired. Comprehensive Rules 15-16-10-2: a [Security] effect activates immediately
    // without pending activation, so it takes precedence even over effects that triggered
    // simultaneously (KB Q6085/Q2221).
    //
    // It resolves WHILE the card is still in the security stack (Comprehensive Rules
    // §15-14-5: a {Security} effect activates while its card is face-up in the security
    // stack), so a [Security] "play this card" effect (playFromSecurity) can locate it
    // there. The battle, if any, happens after the removal triggers below.
    const securityEffectActivated = await deps.resolveSecurityEffect(revealed, attacker.permanentId, wasAlreadyFaceUp);

    if (activateRevealTriggers !== undefined) {
      await activateRevealTriggers();
    } else if (wasAlreadyFaceUp) {
      await deps.fireSubTrigger?.("whenCheckedFaceUpSecurity", {
        attackerPermanentId: attacker.permanentId,
        securityInstanceId: revealed.instanceId,
      });
    } else {
      // Q5789: revealing a face-down card also counts as adding a face-up card.
      await deps.fireFaceUpSecurityAdded?.({ seat: defenderSeat, instanceId: revealed.instanceId });
    }

    // Triggers that watch the check / the security loss.
    await deps.fireTiming(EffectTiming.OnSecurityCheck, {
      attackerPermanentId: attacker.permanentId,
      securityInstanceId: revealed.instanceId,
    });

    // Either the [Security] effect or an OnSecurityCheck-timed reaction may have already
    // relocated the revealed card out of the security stack — e.g. Baihumon's "when your
    // security is checked, if that card is a Digimon with [Deva], play it WITHOUT BATTLING
    // and without paying the cost" (EX5-053, KB Q3644/Q3645). A relocated card is not a
    // Security Digimon any more, so it never battles.
    const remainsInSecurity = defender.security.some((card) => card.instanceId === revealed.instanceId);
    const hadSecurityEffect = securityEffectActivated || !remainsInSecurity;
    // An attacker that already left play (e.g. via the [Security] effect) never battles.
    const battlesAttacker =
      remainsInSecurity && deps.isDigimon(revealed) && deps.permanentById(attacker.permanentId) !== undefined;
    const resolution: "effect" | "battle" | "trashed" = battlesAttacker
      ? "battle"
      : hadSecurityEffect
        ? "effect"
        : "trashed";

    // Remove it from the security stack (source: IReduceSecurity removes
    // SecurityCards[0]) — located by instanceId, NOT a blind shift: if the
    // [Security] effect already moved the card out (played itself / returned to
    // hand), a shift would wrongly remove a DIFFERENT security card.
    const revealedIndex = defender.security.findIndex((c) => c.instanceId === revealed.instanceId);
    if (revealedIndex >= 0) extractCardAt(defender, Zone.Security, revealedIndex);

    await deps.fireTiming(EffectTiming.OnLoseSecurity, {
      attackerPermanentId: attacker.permanentId,
      securityInstanceId: revealed.instanceId,
      removedFromSecuritySeat: defenderSeat,
    });
    // SubTrigger bus: "when a card is removed from security" watchers, co-located with
    // OnLoseSecurity. The removed security card is the event subject (a loose instance).
    await deps.fireSubTrigger?.("whenSecurityRemoved", {
      attackerPermanentId: attacker.permanentId,
      securityInstanceId: revealed.instanceId,
      removedFromSecuritySeat: defenderSeat,
    });

    // The battle against a Security Digimon is the step AFTER the card left the
    // security stack (CR 13-1-8-3, 13-1-7 "a checked Digimon card is treated as a
    // Security Digimon"), so watchers of the removal have already run by now.
    const battle = battlesAttacker ? await battleSecurityDigimon(deps, attacker, revealed) : undefined;

    emit({
      kind: "securityChecked",
      seat: defenderSeat,
      revealedCardId: revealed.cardId,
      resolution,
      ...(battle === undefined ? {} : { battle }),
    });

    // The checked card goes to trash unless an effect already relocated it
    // (e.g. a security Digimon that survived and was put into play, or a
    // [Security] effect that moved it elsewhere).
    const trashedFromSecurity = trashIfStillLoose(state, defenderSeat, revealed);
    if (trashedFromSecurity) {
      await deps.fireSubTrigger?.("whenCardTrashedFromSecurity", {
        attackerPermanentId: attacker.permanentId,
        securityInstanceId: revealed.instanceId,
        removedFromSecuritySeat: defenderSeat,
        trashedFromSecurityInstanceIds: [revealed.instanceId],
      });
    }

    if (battlesAttacker) {
      await deps.fireSubTrigger?.("whenSecurityBattleEnded", {
        attackerPermanentId: attacker.permanentId,
        securityInstanceId: revealed.instanceId,
      });
    }

    // A loss may have been flagged by an effect during resolution.
    if (win.resolveLossFlags()) break;
  }
}

/**
 * Battle the attacker against the revealed Security Digimon (CR 13-1-8-3).
 * Source: the battle branch of ISecurityCheck.
 *
 * Returns the DP-compare outcome so the caller can publish it on `securityChecked`,
 * or `undefined` when no compare happened (the attacker left play in between).
 */
async function battleSecurityDigimon(
  deps: SecurityCheckDeps,
  attacker: SecurityCheckAttacker,
  revealed: CardInstance,
): Promise<SecurityBattleResult | undefined> {
  // The removal watchers that ran between the check and this battle may have
  // removed the attacker from play; there is nothing left to battle then.
  const attackerPermanent = deps.permanentById(attacker.permanentId);
  if (attackerPermanent === undefined) return undefined;

  const outcome = resolveSecurityBattle({
    attackerPermanentId: attacker.permanentId,
    attackerDP: deps.dpOf(attacker.permanentId),
    securityCardDP: deps.securityCardDp(revealed),
  });
  if (outcome.attackerDeleted) {
    // ＜Jamming＞ (§16-9): attacker with Jamming isn't deleted in Security Digimon battles.
    // A "can't be deleted in battle" grant spares it too — LM-003 Q3991 states the protection
    // covers battles against Security Digimon, which are battles like any other.
    const spared =
      deps.hasKeyword?.(attackerPermanent.permanentId, "Jamming") === true ||
      deps.hasRestriction?.(attackerPermanent.permanentId, "beDeletedInBattle") === true;
    if (!spared) {
      await deps.deletePermanents([attacker.permanentId]);
    }
  } else if (outcome.securityDigimonDeleted) {
    // A Security Digimon battle is still a battle for "when this Digimon wins a battle"
    // (BT26-038 Q7020). Publish after the losing-side deletion/prevention boundary, matching
    // Q7022/Q7023, even though the Security Digimon itself is a loose card and never deleted.
    await deps.fireSubTrigger?.("whenBattleWon", {
      attackerPermanentId: attacker.permanentId,
      securityInstanceId: revealed.instanceId,
      subjectPermanentId: attacker.permanentId,
    });
  }
  // The Security Digimon is a loose card, not a field permanent: CR 14-2-3 keeps it
  // alive whatever the DP compare says, and CR 13-1-8-4 sends it to the trash unless
  // an effect gave it an area — which is exactly what trashIfStillLoose applies.
  return outcome;
}

/** Move `card` to the seat's trash if it is not already in another zone. */
function trashIfStillLoose(state: GameState, seat: Seat, card: CardInstance): boolean {
  const player = state.players[seat];
  if (player === undefined) return false;
  const inHand = player.hand.some((c) => c.instanceId === card.instanceId);
  const inSecurity = player.security.some((c) => c.instanceId === card.instanceId);
  const onField = player.battleArea.some((p) => p.topCard?.instanceId === card.instanceId);
  const inTrash = player.trash.some((c) => c.instanceId === card.instanceId);
  const inDeck = player.deck.some((c) => c.instanceId === card.instanceId);
  const inDelay = player.delayZone?.some((c) => c.instanceId === card.instanceId) ?? false;
  if (inHand || inSecurity || onField || inTrash || inDeck || inDelay) return false;
  insertCard(player, Zone.Trash, card);
  return true;
}
