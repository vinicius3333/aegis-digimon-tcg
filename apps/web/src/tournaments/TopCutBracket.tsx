/* The Top Cut, as the server publishes it.

   Everything here is a projection: which players are in the cut, which round each confrontation
   belongs to and whether it is decided are all decided server-side and arrive in `detail.phases`.
   This component picks the cut phase out and lays its rounds out as a bracket — no seeding rule, no
   advancement rule and no clock lives in React. */

import type { PhaseView, RoundView, SeriesScoreView } from "@aegis/shared";
import { Badge, Panel } from "../design/primitives";
import { useTranslation } from "../i18n";
import { matchStateKey, pairingReasonKey, topCutRoundKey } from "./labels";
import type { TournamentDetail } from "./types";

/** The cut phase, or undefined while the event has not reached one. */
export function topCutPhase(phases: readonly PhaseView[] | undefined): PhaseView | undefined {
  return phases?.find((phase) => phase.kind === "top_cut");
}

/**
 * True while the Swiss phase has ended and the cut has not been drawn yet.
 *
 * The Swiss phase parks in `frozen` between the two, which is a real state a player can refresh
 * into: the standings are final, the bracket does not exist, and the honest thing to render is
 * "the cut is being drawn" rather than an empty bracket or nothing at all.
 */
export function isAwaitingTopCut(detail: TournamentDetail): boolean {
  if (!detail.topCutEnabled || topCutPhase(detail.phases)) return false;
  return detail.phases?.some((phase) => phase.kind === "swiss" && phase.status === "frozen") === true;
}

export function TopCutBracket({ detail }: { detail: TournamentDetail }) {
  const { t } = useTranslation();
  const phase = topCutPhase(detail.phases);

  if (isAwaitingTopCut(detail)) {
    return (
      <Panel className="tournaments-bracket">
        <h3>{t("tournaments.topCut.title")}</h3>
        <p role="status">{t("tournaments.topCut.starting", { size: detail.topCutSize ?? 0 })}</p>
      </Panel>
    );
  }
  if (!phase) return null;

  const nameOf = (participantId: string | null): string =>
    (participantId && detail.participants.find((participant) => participant.id === participantId)?.displayName) ??
    (participantId ? participantId : t("tournaments.topCut.emptySeat"));

  return (
    <Panel className="tournaments-bracket">
      <h3>{t("tournaments.topCut.title")}</h3>
      <p className="tournaments-note">{t("tournaments.topCut.size", { size: bracketSize(phase) })}</p>
      <ol className="tournaments-bracket__rounds">
        {phase.rounds.map((round) => (
          <li key={round.number} className="tournaments-bracket__round">
            <h4>{t(topCutRoundKey(round.number, phase.plannedRounds), { round: round.number })}</h4>
            <ul>
              {round.matches.map((match) => (
                <li key={match.matchId} className="tournaments-bracket__match">
                  <span className={seatClass(match, 0)}>{nameOf(match.participant0Id)}</span>
                  <span className="tournaments-bracket__score">
                    {match.wins0} - {match.wins1}
                  </span>
                  <span className={seatClass(match, 1)}>{nameOf(match.participant1Id)}</span>
                  <Badge tone={match.status === "resolved" ? "success" : "neutral"}>
                    {t(matchStateKey(match.status))}
                  </Badge>
                  {/* The official ruleset runs the deciding match with no clock at all, and a
                      player has to be able to see that rather than infer it from a missing timer. */}
                  {isFinal(round, phase) && match.seriesDeadlineAt === null ? (
                    <Badge tone="warning">{t("tournaments.topCut.untimed")}</Badge>
                  ) : null}
                  {/* Only the pairings that need explaining — a paired-down player or an
                      unavoidable rematch. The ordinary same-score pairing says nothing. */}
                  {pairingReasonKey(match.pairingReason) ? (
                    <Badge tone="neutral">{t(pairingReasonKey(match.pairingReason)!)}</Badge>
                  ) : null}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

function isFinal(round: RoundView, phase: PhaseView): boolean {
  return phase.plannedRounds !== null && round.number >= phase.plannedRounds;
}

/** How many players the cut admitted: twice the confrontations of its first round. */
function bracketSize(phase: PhaseView): number {
  return (phase.rounds[0]?.matches.length ?? 0) * 2;
}

function seatClass(match: SeriesScoreView, seat: 0 | 1): string {
  const participantId = seat === 0 ? match.participant0Id : match.participant1Id;
  const won = match.winnerParticipantId !== null && match.winnerParticipantId === participantId;
  return won ? "tournaments-bracket__seat tournaments-bracket__seat--winner" : "tournaments-bracket__seat";
}
