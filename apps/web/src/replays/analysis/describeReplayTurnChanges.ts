import type { Seat } from "@aegis/shared/schema/enums";
import type { Translate, TranslationKey } from "@/i18n/translationTypes";
import type { ReplaySeatStats, ReplayTurnStats } from "@/replays/analysis/buildReplayAnalysis";

type Params = { turn: ReplayTurnStats; players: readonly string[]; t: Translate };

const DESCRIBED_CHANGES: readonly { key: keyof ReplaySeatStats; label: TranslationKey }[] = [
  { key: "security", label: "replayAnalysis.stat.security" },
  { key: "board", label: "replayAnalysis.stat.board" },
  { key: "hand", label: "replayAnalysis.stat.hand" },
];
const SEATS = [0, 1] as const satisfies readonly Seat[];

function formatSigned(value: number): string {
  if (value > 0) {
    return `+${value}`;
  }
  return `−${Math.abs(value)}`;
}

export function describeReplayTurnChanges({ turn, players, t }: Params): string {
  return SEATS.flatMap((seat) => {
    const parts = DESCRIBED_CHANGES.filter(({ key }) => turn.changes[seat][key] !== 0).map(
      ({ key, label }) => `${t(label)} ${formatSigned(turn.changes[seat][key])}`,
    );
    return parts.length === 0 ? [] : [`${players[seat]}: ${parts.join(", ")}`];
  }).join(" · ");
}
