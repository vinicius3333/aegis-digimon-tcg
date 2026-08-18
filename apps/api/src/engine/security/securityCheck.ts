import {
  EffectTiming,
  Zone,
  type CardInstance,
  type GameState,
  type Permanent,
  type PlayerState,
  type Seat,
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
 *      a. take the top security card (security[0]) and reveal it (faceUp = true),
 *      b. fire the OnSecurityCheck trigger,
 *      c. run its [Security] effect, if any (the card is STILL in the security
 *         stack, so a [Security] "play this card" effect can locate it there),
 *      d. remove it from the security stack (by instanceId; skipped if the
 *         effect already moved it out),
 *      e. fire OnLoseSecurity + whenSecurityRemoved watchers,
 *      f. if no [Security] effect ran and the card is a Digimon -> battle the
 *         attacker (DP compare),
 *      g. the checked card goes to trash unless an effect relocated it,
 *      h. stop early if the attacker has left play.
 *
 * Steps d/e run BEFORE the battle (Comprehensive Rules 13-1-6: "a checked card is
 * removed from the security stack" happens at the check; the battle is the later
 * 13-1-8-3 step). KB Q6085/Q2221 confirm the ordering: a [Security] effect activates
 * first, then the pending "performs a security check" and "a card was removed from the
 * security stack" triggers, and only then the battle. So an attacker deleted BY the
 * battle still fires its whenSecurityRemoved watchers (e.g. BT14-001's inherited
 * ＜Draw 1＞), while one removed by the [Security] effect does not (KB Q2611/Q2629).
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
   *   - `whenCheckedFaceUpSecurity`: fires when the attacker checks a card that was already
   *     face-up in the security stack (BT20-055 CAP-H-03). Carries the attacker's permanent ID
   *     so a watcher knows which Digimon did the check.
   */
  fireSubTrigger?(
    event: "whenSecurityRemoved" | "whenCheckedFaceUpSecurity" | "whenSecurityBattleEnded",
    info: { attackerPermanentId: string; securityInstanceId: string; removedFromSecuritySeat?: Seat },
  ): Promise<void>;

  /**
   * Fire `whenFaceUpCardsAddedToOpponentSecurity` for the OTHER half of "a face-up card is
   * added to security" (KB Q5789 binding: a check that flips a face-down card face-up counts
   * as a face-up card being "added", not just an effect-driven security add). Optional so the
   * security unit tests need no change; absent => no watcher runs.
   */
  fireFaceUpSecurityAdded?(info: { seat: Seat; instanceId: string }): Promise<void>;

  /**
   * Resolve the revealed card's [Security] effect, if any. Returns true when a
   * security effect existed and was resolved. A Digimon still battles afterward unless
   * that effect relocated it out of security. `attackerPermanentId`
   * identifies the attacking permanent so a security-effect disable attached to it
   * (DisableSecurityEffect) can skip the effect while still trashing the card (KB Q886).
   */
  resolveSecurityEffect(card: CardInstance, attackerPermanentId: string): Promise<boolean>;

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
}

/**
 * Run a security check triggered by a successful player-directed attack.
 *
 * @param defenderSeat the seat whose security is being checked (the attacked player)
 * @param attacker     the attacking permanent
 * @returns nothing; mutates GameState (security/trash zones) and may end the game
 */
export async function runSecurityCheck(
  state: GameState,
  emit: (event: ServerEvent) => void,
  win: WinCheck,
  deps: SecurityCheckDeps,
  defenderSeat: Seat,
  attacker: SecurityCheckAttacker,
): Promise<void> {
  const defender: PlayerState | undefined = state.players[defenderSeat];
  if (defender === undefined) return;

  if (deps.strikeFor(attacker) <= 0) return; // Source: `if (AttackingPermanent.Strike == 0) yield break;`

  // Empty security + a landing player attack => the attacker's controller wins.
  // Source: AttackProcess.DetermineAttackOutcome, `SecurityCards.Count == 0`.
  if (defender.security.length === 0) {
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

    // A pre-existing face-up security card fires whenCheckedFaceUpSecurity BEFORE the reveal
    // (KB BT20-055: "when your Digimon checks a face-up security card"). Check the flag now,
    // before the reveal sets it, so a face-down card never triggers the event.
    const wasAlreadyFaceUp = revealed.faceUp === true;

    // Reveal the top security card. Source: it becomes face-up during the check.
    revealed.faceUp = true;
    checkedCount += 1;

    if (wasAlreadyFaceUp) {
      await deps.fireSubTrigger?.("whenCheckedFaceUpSecurity", {
        attackerPermanentId: attacker.permanentId,
        securityInstanceId: revealed.instanceId,
      });
    } else {
      // The check just flipped a face-down card face-up — the other half of
      // "whenFaceUpCardsAddedToOpponentSecurity" (KB Q5789 binding: a security check revealing
      // a card counts as a face-up card being "added", not just an effect-driven add). Fires
      // for defenderSeat's stack; the interpreter gate matches a watcher only when defenderSeat
      // is THAT watcher's own opponent (so the defender's own copy of this card does not react
      // to its own security being checked).
      await deps.fireFaceUpSecurityAdded?.({ seat: defenderSeat, instanceId: revealed.instanceId });
    }

    // Triggers that watch the check / the security loss.
    await deps.fireTiming(EffectTiming.OnSecurityCheck, {
      attackerPermanentId: attacker.permanentId,
      securityInstanceId: revealed.instanceId,
    });

    // A permanent's OnSecurityCheck-timed reaction (just fired above) may have already
    // relocated the revealed card out of the security stack — e.g. Baihumon's "when
    // your security is checked, if that card is a Digimon with [Deva], play it
    // WITHOUT BATTLING and without paying the cost" (EX5-053, KB Q3644/Q3645). When
    // that happens, skip the normal resolve-and-battle branch entirely: the card was
    // already handled by the effect, so battling it again would be wrong.
    const relocatedByOnSecurityCheck = !defender.security.some(
      (c) => c.instanceId === revealed.instanceId,
    );

    // Resolve the card's [Security] effect WHILE it is still in the security stack
    // (Comprehensive Rules §15-14-5: a {Security} effect activates while its card is
    // face-up in the security stack). A [Security] "play this card" effect
    // (playFromSecurity) must still be able to locate the card in security at
    // resolution time. The battle, if any, happens after the removal triggers below.
    const hadSecurityEffect =
      relocatedByOnSecurityCheck || (await deps.resolveSecurityEffect(revealed, attacker.permanentId));
    // An attacker that already left play (e.g. via the [Security] effect) never battles.
    const remainsInSecurity = defender.security.some((card) => card.instanceId === revealed.instanceId);
    const battlesAttacker =
      remainsInSecurity &&
      deps.isDigimon(revealed) &&
      deps.permanentById(attacker.permanentId) !== undefined;
    const resolution: "effect" | "battle" | "trashed" = battlesAttacker
      ? "battle"
      : hadSecurityEffect
        ? "effect"
        : "trashed";

    // Remove it from the security stack (source: IReduceSecurity removes
    // SecurityCards[0]) — located by instanceId, NOT a blind shift: if the
    // [Security] effect already moved the card out (played itself / returned to
    // hand), a shift would wrongly remove a DIFFERENT security card.
    const revealedIndex = defender.security.findIndex(
      (c) => c.instanceId === revealed.instanceId,
    );
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
    if (battlesAttacker) await battleSecurityDigimon(deps, attacker, revealed);

    emit({
      kind: "securityChecked",
      seat: defenderSeat,
      revealedCardId: revealed.cardId,
      resolution,
    });

    // The checked card goes to trash unless an effect already relocated it
    // (e.g. a security Digimon that survived and was put into play, or a
    // [Security] effect that moved it elsewhere).
    trashIfStillLoose(state, defenderSeat, revealed);

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
 */
async function battleSecurityDigimon(
  deps: SecurityCheckDeps,
  attacker: SecurityCheckAttacker,
  revealed: CardInstance,
): Promise<void> {
  // The removal watchers that ran between the check and this battle may have
  // removed the attacker from play; there is nothing left to battle then.
  const attackerPermanent = deps.permanentById(attacker.permanentId);
  if (attackerPermanent === undefined) return;

  const outcome = resolveSecurityBattle({
    attackerPermanentId: attacker.permanentId,
    attackerDP: deps.dpOf(attacker.permanentId),
    securityCardDP: deps.securityCardDp(revealed),
  });
  if (outcome.attackerDeleted) {
    // ＜Jamming＞ (§16-9): attacker with Jamming isn't deleted in Security Digimon battles.
    if (deps.hasKeyword?.(attackerPermanent.permanentId, "Jamming") !== true) {
      await deps.deletePermanents([attacker.permanentId]);
    }
  }
  // The Security Digimon is a loose card, not a field permanent: CR 14-2-3 keeps it
  // alive whatever the DP compare says, and CR 13-1-8-4 sends it to the trash unless
  // an effect gave it an area — which is exactly what trashIfStillLoose applies.
}

/** Move `card` to the seat's trash if it is not already in another zone. */
function trashIfStillLoose(state: GameState, seat: Seat, card: CardInstance): void {
  const player = state.players[seat];
  if (player === undefined) return;
  const inHand = player.hand.some((c) => c.instanceId === card.instanceId);
  const inSecurity = player.security.some((c) => c.instanceId === card.instanceId);
  const onField = player.battleArea.some(
    (p) => p.topCard?.instanceId === card.instanceId,
  );
  const inTrash = player.trash.some((c) => c.instanceId === card.instanceId);
  const inDeck = player.deck.some((c) => c.instanceId === card.instanceId);
  const inDelay = player.delayZone?.some((c) => c.instanceId === card.instanceId) ?? false;
  if (inHand || inSecurity || onField || inTrash || inDeck || inDelay) return;
  insertCard(player, Zone.Trash, card);
}
