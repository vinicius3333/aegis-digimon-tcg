import type { MatchReplay, Seat } from "@aegis/shared";

export function turnPositions(replay: MatchReplay): { index: number; turn: number; seat: Seat }[] {
  return replay.frames.flatMap((frame, index) =>
    index === 0 ||
    frame.state.turnCount !== replay.frames[index - 1]!.state.turnCount ||
    frame.state.turnSeat !== replay.frames[index - 1]!.state.turnSeat
      ? [{ index, turn: frame.state.turnCount, seat: frame.state.turnSeat }]
      : [],
  );
}

/** Skips thinking time, while giving each animation room to finish at the selected speed. */
export function frameDelay(replay: MatchReplay, index: number, speed: number): number {
  const gap = (replay.frames[index + 1]?.atMs ?? replay.frames[index]!.atMs) - replay.frames[index]!.atMs;
  return Math.min(2500, Math.max(1000, gap)) / speed;
}

export function playbackState(replay: MatchReplay, index: number, showHand: boolean) {
  const frame = replay.frames[index]!;
  if (showHand) return frame.state;
  return {
    ...frame.state,
    players: Array.from(frame.state.players, (player) => ({ ...player, hand: [] })),
  } as unknown as typeof frame.state;
}
