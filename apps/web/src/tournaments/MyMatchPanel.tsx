/* "My match" — the skeleton the match-series slice fills in.

   It renders strictly what `GET /tournaments/:id` carries today: the legacy bracket row (round,
   opponent account id, resolved/unresolved) and the frozen rules. Presence, the BO3 game score and
   the join deadline are series state that no endpoint publishes yet, so each is rendered as an
   explicit "pending" state rather than invented. The extension points are marked below: once
   `SeriesScoreView` reaches the detail payload, pass it in as `series` and the placeholders resolve
   into real values without moving this component. */

import { Alert, Badge, Panel } from "../design/primitives";
import { useTranslation } from "../i18n";
import { useCountdown } from "./hooks";
import { countdownLevelKey, pairingReasonKey } from "./labels";
import type { SeriesScoreView } from "@aegis/shared";
import type { LegacyTournamentMatch, TournamentDetail } from "./types";

/** The player's open bracket row, or undefined when they have none in this event. */
export function findMyMatch(matches: readonly LegacyTournamentMatch[], accountId: string | undefined): LegacyTournamentMatch | undefined {
  if (!accountId) return undefined;
  const mine = matches.filter((match) => match.player0AccountId === accountId || match.player1AccountId === accountId);
  return mine.find((match) => match.status !== "finished") ?? mine[mine.length - 1];
}

export function MyMatchPanel({ detail, accountId, series }: { detail: TournamentDetail; accountId: string | undefined; series?: SeriesScoreView }) {
  const { t } = useTranslation();
  const match = findMyMatch(detail.matches, accountId);
  const joinDeadlineAt = series?.joinDeadlineAt ?? null;
  const countdown = useCountdown(joinDeadlineAt);
  const winsRequired = detail.rules?.match.winsRequired ?? (detail.bestOf === 3 ? 2 : 1);

  if (!match) {
    return (
      <Panel className="tournaments-my-match">
        <h3>{t("tournaments.myMatch.title")}</h3>
        <p>{t("tournaments.myMatch.none")}</p>
      </Panel>
    );
  }

  const opponentAccountId = match.player0AccountId === accountId ? match.player1AccountId : match.player0AccountId;

  return (
    <Panel className="tournaments-my-match">
      <h3>{t("tournaments.myMatch.title")}</h3>
      <dl>
        <dt>{t("tournaments.myMatch.round")}</dt>
        <dd>{match.round}</dd>

        <dt>{t("tournaments.myMatch.opponent")}</dt>
        <dd>
          {match.status === "bye"
            ? t("tournaments.myMatch.bye")
            : opponentAccountId
              // Extension point: the detail payload exposes no account id on ParticipantView, so a
              // bracket opponent cannot be resolved to a display name yet. Slice 3 replaces this
              // with the series' participant ids, which DO join with `detail.participants`.
              ? <code>{opponentAccountId}</code>
              : t("tournaments.myMatch.opponentUnknown")}
        </dd>

        {/* Why this opponent, when the answer is not "the same record as you". A player paired down
            or into a forced rematch should be told, rather than left to read a mismatched record as
            a pairing mistake. */}
        {pairingReasonKey(series?.pairingReason) ? (
          <>
            <dt>{t("tournaments.myMatch.pairing")}</dt>
            <dd>
              <Badge tone="neutral">{t(pairingReasonKey(series?.pairingReason)!)}</Badge>
            </dd>
          </>
        ) : null}

        <dt>{t("tournaments.myMatch.presence")}</dt>
        <dd>{t("tournaments.myMatch.presencePending")}</dd>

        <dt>{t("tournaments.myMatch.score")}</dt>
        <dd>
          {series
            ? `${series.wins0} - ${series.wins1}`
            : t("tournaments.myMatch.scorePending", { wins: winsRequired })}
        </dd>

        <dt>{t("tournaments.myMatch.joinDeadline")}</dt>
        <dd>
          <Badge tone={countdown.level === "expired" || countdown.level === "warning_1m" ? "danger" : countdown.level === "none" ? "neutral" : "warning"}>
            {t(countdownLevelKey(countdown.level))}
          </Badge>
          <span className="tournaments-my-match__clock">{joinDeadlineAt === null ? t("tournaments.myMatch.noDeadline") : countdown.text}</span>
        </dd>
      </dl>
      <Alert tone="info" title={t("tournaments.myMatch.pendingTitle")}>{t("tournaments.myMatch.pendingBody")}</Alert>
    </Panel>
  );
}
