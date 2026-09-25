import type { Permanent, PlayerState } from "@aegis/shared";
import type { HeldDeletion } from "../../match/types";

/**
 * Keep transient server-resolved abilities current while the presentation queue is still
 * rendering an older board revision. A decision can already be actionable against the live
 * state at that point (EX13-060's end-of-turn play grants Rush), so showing the snapshot's
 * stale keywords would contradict both the prompt and the attack the server accepts.
 *
 * Only projection fields are refreshed. Membership, stacks, suspension and zones remain on
 * the presented timeline so arrival and combat animations do not jump ahead.
 */
export function liveProjectionFields({ player, live }: { player: PlayerState; live: PlayerState }): PlayerState {
  let changed = false;
  const battleArea = player.battleArea.map((permanent) => {
    const current = live.battleArea.find((candidate) => candidate.permanentId === permanent.permanentId);
    if (current === undefined) return permanent;
    if (
      permanent.keywords === current.keywords &&
      permanent.grantedKeywords === current.grantedKeywords &&
      permanent.summoningSick === current.summoningSick &&
      permanent.securityAttackModifier === current.securityAttackModifier &&
      permanent.currentDP === current.currentDP &&
      permanent.immuneToOpponentDigimonEffects === current.immuneToOpponentDigimonEffects
    )
      return permanent;
    changed = true;
    return {
      ...permanent,
      keywords: current.keywords,
      grantedKeywords: current.grantedKeywords,
      summoningSick: current.summoningSick,
      securityAttackModifier: current.securityAttackModifier,
      currentDP: current.currentDP,
      immuneToOpponentDigimonEffects: current.immuneToOpponentDigimonEffects,
    } as Permanent;
  });
  return changed ? ({ ...player, battleArea } as PlayerState) : player;
}

export function phaseField(input: { player: PlayerState; held: PlayerState | undefined }): PlayerState {
  const { player, held } = input;
  if (!held) return player;
  return {
    ...player,
    // Hold rotation, not membership: a start-turn effect may introduce a
    // permanent that the viewer must select before Main can open.
    //
    // Only the unsuspend direction is held. The hold exists so the unsuspend phase's own
    // rotation waits for the ribbon and the sweep that announce it (CR 6-2), and that phase
    // never suspends anything. A permanent the live board shows as suspended was suspended
    // by something else — an attack in the outgoing player's end-of-turn window (<Engage>,
    // <Vortex>), milliseconds before the turn flipped — and its snapshot predates that
    // suspension, so holding it left the attacker standing upright until the hold lifted a
    // ribbon later.
    battleArea: player.battleArea.map((permanent) => {
      const previous = held.battleArea.find((candidate) => candidate.permanentId === permanent.permanentId);
      if (previous === undefined || !previous.isSuspended || permanent.isSuspended) return permanent;
      return { ...permanent, isSuspended: true } as Permanent;
    }),
  } as PlayerState;
}

/**
 * Keep the board a security check's battle still needs. The loser is trashed before the
 * check closes, so between the reveal and the clash the live state has already dropped it
 * — the permanent off the field, the cards into the trash — while the scene that kills it
 * is still on screen. Membership and the trash are held at the snapshot the reveal took;
 * everything else (rotation, DP, counters) keeps following the live board, so nothing but
 * the departure itself is delayed.
 */
export function blowField(input: { player: PlayerState; held: PlayerState | undefined }): PlayerState {
  const { player, held } = input;
  if (!held) return player;
  const leaving = held.battleArea.filter(
    (previous) => !player.battleArea.some((permanent) => permanent.permanentId === previous.permanentId),
  );
  if (leaving.length === 0 && player.trash.length === held.trash.length) return player;
  // Put each held permanent back in the slot it had, so the survivors do not shuffle
  // around it while the clash plays.
  const battleArea = [...player.battleArea];
  for (const permanent of leaving) {
    battleArea.splice(Math.min(held.battleArea.indexOf(permanent), battleArea.length), 0, permanent);
  }
  return { ...player, battleArea, trash: held.trash } as PlayerState;
}

/**
 * Keep each deleted permanent where it stood until its shatter has begun. Only membership
 * is held: a card the board has already dropped is put back in its slot, and the trash stays
 * as it was before the oldest of them reached it. Everything else keeps following the board.
 */
export function deletionField(input: { player: PlayerState; held: readonly HeldDeletion[] }): PlayerState {
  const { player, held } = input;
  if (held.length === 0) return player;
  const battleArea = [...player.battleArea];
  let restored = false;
  for (const deletion of held) {
    if (battleArea.some((permanent) => permanent.permanentId === deletion.permanent.permanentId)) continue;
    battleArea.splice(Math.min(deletion.index, battleArea.length), 0, deletion.permanent);
    restored = true;
  }
  if (!restored) return player;
  return { ...player, battleArea, trash: held[0]!.trash } as PlayerState;
}
