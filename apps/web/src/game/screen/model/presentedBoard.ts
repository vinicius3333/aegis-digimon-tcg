import type { Permanent, PlayerState } from "@aegis/shared";

export function phaseField(input: { player: PlayerState; held: PlayerState | undefined }): PlayerState {
  const { player, held } = input;
  if (!held) return player;
  return {
    ...player,
    // Hold rotation, not membership: a start-turn effect may introduce a
    // permanent that the viewer must select before Main can open.
    battleArea: player.battleArea.map((permanent) => {
      const previous = held.battleArea.find((candidate) => candidate.permanentId === permanent.permanentId);
      return previous ? ({ ...permanent, isSuspended: previous.isSuspended } as Permanent) : permanent;
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
  return { ...player, battleArea: [...player.battleArea, ...leaving], trash: held.trash } as PlayerState;
}
