import type { Permanent, PlayerState } from "@aegis/shared";

export function phaseField(input: { player: PlayerState; held: PlayerState | undefined }) {
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
  };
}
