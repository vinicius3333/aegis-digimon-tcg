import { useMemo, useState } from "react";
import type { MatchReplay } from "@aegis/shared/replays";
import type { Seat } from "@aegis/shared/schema/enums";
import { cardName } from "@/design/theme";
import { HelpTip } from "@/design/HelpTip";
import { useTranslation } from "@/i18n/useTranslation";
import type { TranslationKey } from "@/i18n/translationTypes";
import {
  buildReplayPlayerReports,
  type ReplayDrawnCard,
  type ReplayPlayerStats,
} from "@/replays/analysis/buildReplayPlayerReports";

type Props = { replay: MatchReplay; onSeek: (index: number) => void };
type CardListProps = { cards: readonly ReplayDrawnCard[] };

const STAT_ROWS: readonly { key: keyof ReplayPlayerStats; label: TranslationKey; help: TranslationKey }[] = [
  { key: "cardsPlayed", label: "replayAnalysis.stats.cardsPlayed", help: "replayAnalysis.statsHelp.cardsPlayed" },
  { key: "digivolutions", label: "replayAnalysis.stats.digivolutions", help: "replayAnalysis.statsHelp.digivolutions" },
  { key: "memorySpent", label: "replayAnalysis.stats.memorySpent", help: "replayAnalysis.statsHelp.memorySpent" },
  { key: "effects", label: "replayAnalysis.stats.effects", help: "replayAnalysis.statsHelp.effects" },
  { key: "attacks", label: "replayAnalysis.stats.attacks", help: "replayAnalysis.statsHelp.attacks" },
  {
    key: "securityChecks",
    label: "replayAnalysis.stats.securityChecks",
    help: "replayAnalysis.statsHelp.securityChecks",
  },
  { key: "blocks", label: "replayAnalysis.stats.blocks", help: "replayAnalysis.statsHelp.blocks" },
  { key: "lostInBattle", label: "replayAnalysis.stats.lostInBattle", help: "replayAnalysis.statsHelp.lostInBattle" },
  { key: "lostToEffects", label: "replayAnalysis.stats.lostToEffects", help: "replayAnalysis.statsHelp.lostToEffects" },
];
const SEATS = [0, 1] as const satisfies readonly Seat[];

function CardList({ cards }: CardListProps) {
  const { t } = useTranslation();
  return (
    <ul className="replay-analysis__cards">
      {cards.map((card, position) => (
        <li key={position} title={card.cardId}>
          {cardName(card.cardId)}
          {card.byEffect ? <small>{t("replayAnalysis.players.byEffect")}</small> : null}
        </li>
      ))}
    </ul>
  );
}

export function ReplayPlayersTab({ replay, onSeek }: Props) {
  const { t } = useTranslation();
  const reports = useMemo(() => buildReplayPlayerReports({ replay }), [replay]);
  const [seat, setSeat] = useState<Seat>(0);
  const report = reports[seat];
  const asCards = (cardIds: readonly string[]) => cardIds.map((cardId) => ({ cardId, byEffect: false }));
  return (
    <>
      <section className="replay-analysis__section" aria-labelledby="replay-analysis-stats">
        <h3 id="replay-analysis-stats">{t("replayAnalysis.players.stats")}</h3>
        <table className="replay-analysis__stats">
          <thead>
            <tr>
              <th scope="col">
                <span className="aegis-sr-only">{t("replayAnalysis.players.stat")}</span>
              </th>
              {SEATS.map((entry) => (
                <th key={entry} scope="col" data-seat={entry}>
                  <span className="replay-analysis__seat-dot" aria-hidden="true" />
                  {replay.players[entry]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {STAT_ROWS.map((row) => (
              <tr key={row.key}>
                <th scope="row">
                  <span className="replay-analysis__stat-name">
                    {t(row.label)}
                    <HelpTip label={t(row.label)}>
                      <strong>{t(row.label)}</strong>
                      <p>{t(row.help)}</p>
                    </HelpTip>
                  </span>
                </th>
                {SEATS.map((entry) => (
                  <td key={entry}>{reports[entry].stats[row.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="replay-analysis__section" aria-labelledby="replay-analysis-hands">
        <h3 id="replay-analysis-hands">{t("replayAnalysis.players.hands")}</h3>
        <div className="replay-analysis__seat-switch" role="group" aria-label={t("replayAnalysis.player")}>
          {SEATS.map((entry) => (
            <button
              key={entry}
              type="button"
              data-seat={entry}
              aria-pressed={seat === entry}
              onClick={() => setSeat(entry)}
            >
              <span className="replay-analysis__seat-dot" aria-hidden="true" />
              {replay.players[entry]}
            </button>
          ))}
        </div>
        <h4>{t("replayAnalysis.players.openingHand")}</h4>
        <CardList cards={asCards(report.openingHand)} />
        <p className="replay-analysis__result">
          {t(report.redrew ? "replayAnalysis.players.redrew" : "replayAnalysis.players.kept")}
        </p>
        {report.redrew ? (
          <>
            <h4>{t("replayAnalysis.players.newHand")}</h4>
            <CardList cards={asCards(report.startingHand)} />
          </>
        ) : null}
        <h4>{t("replayAnalysis.players.draws")}</h4>
        {report.draws.length === 0 ? (
          <p className="replay-analysis__hint">{t("replayAnalysis.players.noDraws")}</p>
        ) : null}
        <ol className="replay-analysis__draws">
          {report.draws.map((draw) => (
            <li key={draw.turn}>
              <button
                type="button"
                title={t("replayAnalysis.decisionAt", { action: draw.frameIndex + 1 })}
                onClick={() => onSeek(draw.frameIndex)}
              >
                {t("replayAnalysis.players.turn", { turn: draw.turn })}
              </button>
              <CardList cards={draw.cards} />
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
