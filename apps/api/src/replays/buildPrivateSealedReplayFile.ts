import type { MatchReplay, Seat } from "@aegis/shared";
import type { ParticipantReplayFile } from "#api/replays/recording";
type Params = { replay: MatchReplay; seat: Seat };
export function buildPrivateSealedReplayFile({ replay, seat }: Params): ParticipantReplayFile {
  const copy = structuredClone(replay);
  copy.viewerSeat = seat;
  copy.visibleHandSeats = [seat];
  for (const frame of copy.frames) {
    for (const player of frame.state.players) {
      if (player.seat !== seat) {
        player.hand = [] as never;
      }
    }
    frame.events = frame.events.filter((event) => event.kind !== "finalReveal");
  }
  const {
    frames: _frames,
    decks: _decks,
    viewerSeat: _viewerSeat,
    visibleHandSeats: _visibleHandSeats,
    format: _format,
    version: _version,
    ...summary
  } = copy;
  return { summary, json: JSON.stringify(copy) };
}
