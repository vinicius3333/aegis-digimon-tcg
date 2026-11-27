import { formatMatchTime } from "@/game/MatchTimer";
import type { Translate } from "@/i18n/translationTypes";

type Params = {
  turnCount: number;
  durationSeconds: number;
  spectating: boolean;
  opponentBoardCount: number;
  viewerSecurityCount: number;
  t: Translate;
};

export function getResultStats({
  turnCount,
  durationSeconds,
  spectating,
  opponentBoardCount,
  viewerSecurityCount,
  t,
}: Params): { value: number | string; label: string }[] {
  return [
    { value: turnCount, label: t("game.stats.turns") },
    ...(durationSeconds > 0 ? [{ value: formatMatchTime(durationSeconds), label: t("game.stats.duration") }] : []),
    ...(spectating
      ? []
      : [
          { value: opponentBoardCount, label: t("game.stats.oppBoard") },
          { value: viewerSecurityCount, label: t("game.stats.yourSecurity") },
        ]),
  ];
}
