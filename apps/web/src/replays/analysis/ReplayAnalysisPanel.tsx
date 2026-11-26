import { useEffect, useMemo, useRef, useState } from "react";
import { Cpu, Hand, Layers, LayoutGrid, Shield, Trash2, Zap, type LucideIcon } from "lucide-react";
import type { MatchReplay } from "@aegis/shared/replays";
import { ReplayDecisionQuality } from "@aegis/shared/replays/analysis/ReplayDecisionQuality";
import type { Seat } from "@aegis/shared/schema/enums";
import { Icons } from "@/design/icons";
import { Button } from "@/design/primitives";
import { isGameOverReason, type GameOverReason } from "@/game/gameOverSplash";
import { useTranslation } from "@/i18n/useTranslation";
import type { TranslationKey } from "@/i18n/translationTypes";
import { buildReplayAnalysis, type ReplaySeatStats } from "@/replays/analysis/buildReplayAnalysis";
import { ReplayAnalysisTab } from "@/replays/analysis/ReplayAnalysisTab";
import { ReplayDecisionList } from "@/replays/analysis/ReplayDecisionList";
import { ReplayAdvantageGraph } from "@/replays/analysis/ReplayAdvantageGraph";
import { ReplayAdvantageSource } from "@/replays/analysis/ReplayAdvantageSource";
import { ReplayDecisionQualityTip } from "@/replays/analysis/ReplayDecisionQualityTip";
import { useExperimentalReplayRatings } from "@/replays/analysis/useExperimentalReplayRatings";
import { HelpTip } from "@/design/HelpTip";
import { ReplayPlayersTab } from "@/replays/analysis/ReplayPlayersTab";
import { getReplayAccuracy } from "@/replays/analysis/getReplayAccuracy";
import { describeReplayTurnChanges } from "@/replays/analysis/describeReplayTurnChanges";
import "@/replays/analysis/replayAnalysis.css";

type Props = {
  replay: MatchReplay;
  index: number;
  onJump: (index: number) => void;
  onSeek: (index: number) => void;
  onClose: () => void;
};

type StatColumn = { key: keyof ReplaySeatStats; label: TranslationKey; help: TranslationKey; icon: LucideIcon };

const STAT_COLUMNS: readonly StatColumn[] = [
  { key: "memory", label: "replayAnalysis.stat.memory", help: "replayAnalysis.statHelp.memory", icon: Cpu },
  { key: "security", label: "replayAnalysis.stat.security", help: "replayAnalysis.statHelp.security", icon: Shield },
  { key: "board", label: "replayAnalysis.stat.board", help: "replayAnalysis.statHelp.board", icon: LayoutGrid },
  { key: "hand", label: "replayAnalysis.stat.hand", help: "replayAnalysis.statHelp.hand", icon: Hand },
  { key: "trash", label: "replayAnalysis.stat.trash", help: "replayAnalysis.statHelp.trash", icon: Trash2 },
  { key: "deck", label: "replayAnalysis.stat.deck", help: "replayAnalysis.statHelp.deck", icon: Layers },
];
const SEATS = [0, 1] as const satisfies readonly Seat[];
const REASON_KEYS = {
  security: "replayAnalysis.reason.security",
  deckOut: "replayAnalysis.reason.deckOut",
  surrender: "replayAnalysis.reason.surrender",
  effect: "replayAnalysis.reason.effect",
  timeout: "replayAnalysis.reason.timeout",
} as const satisfies Record<GameOverReason, TranslationKey>;

function getFavoredSeat(swing: number): Seat {
  return swing >= 0 ? 0 : 1;
}

const QUALITY_ORDER: readonly ReplayDecisionQuality[] = Object.values(ReplayDecisionQuality).map(
  (entry) => entry.value,
);

function findWorstQualities(replay: MatchReplay): Map<string, ReplayDecisionQuality> {
  const worst = new Map<string, ReplayDecisionQuality>();
  for (const decision of replay.decisions ?? []) {
    if (decision.quality === undefined) {
      continue;
    }
    const key = `${decision.turn}:${decision.seat}`;
    const current = worst.get(key);
    if (current === undefined || QUALITY_ORDER.indexOf(decision.quality) > QUALITY_ORDER.indexOf(current)) {
      worst.set(key, decision.quality);
    }
  }
  return worst;
}

function getEndReason(replay: MatchReplay): GameOverReason | undefined {
  const event = replay.frames
    .at(-1)
    ?.events.filter((entry) => entry.kind === "gameOver")
    .at(-1);
  if (event?.kind !== "gameOver" || !isGameOverReason(event.reason)) {
    return undefined;
  }
  return event.reason;
}

export function ReplayAnalysisPanel({ replay, index, onJump, onSeek, onClose }: Props) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<ReplayAnalysisTab>(ReplayAnalysisTab.SUMMARY.value);
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (panel.current) {
      panel.current.scrollTop = 0;
    }
  }, [tab]);
  useEffect(() => {
    panel.current?.querySelector('[aria-current="step"]')?.scrollIntoView({ block: "nearest" });
  }, [index, tab]);
  const analysis = useMemo(() => buildReplayAnalysis({ replay }), [replay]);
  const [ratings, setRatings] = useExperimentalReplayRatings();
  const worstQualities = useMemo(() => findWorstQualities(replay), [replay]);
  const source = Object.values(ReplayAdvantageSource).find((entry) => entry.value === analysis.source)!;
  const formatSwing = (swing: number) =>
    analysis.source === ReplayAdvantageSource.BOT.value ? `${Math.abs(swing)}%` : String(Math.abs(swing));
  const accuracies = SEATS.map((seat) => getReplayAccuracy({ decisions: replay.decisions ?? [], seat }));
  const currentTurn = analysis.turns.filter((turn) => turn.startIndex <= index).at(-1);
  const lastTurn = replay.frames.at(-1)!.state.turnCount;
  const reason = getEndReason(replay);
  const loser = replay.winnerSeat === 0 || replay.winnerSeat === 1 ? replay.players[1 - replay.winnerSeat]! : "";

  function renderSummary() {
    return (
      <section className="replay-analysis__section" aria-labelledby="replay-analysis-decided">
        <h3 id="replay-analysis-decided">{t("replayAnalysis.decided")}</h3>
        <p className="replay-analysis__result">
          {replay.winnerSeat < 0
            ? t("replayAnalysis.draw", { turn: lastTurn })
            : t("replayAnalysis.result", { name: replay.players[replay.winnerSeat]!, turn: lastTurn })}{" "}
          {reason === undefined ? null : t(REASON_KEYS[reason], { name: loser })}
        </p>
        <ReplayAdvantageGraph
          replay={replay}
          analysis={analysis}
          index={index}
          ratings={ratings}
          onSeek={onSeek}
          onJump={onJump}
        />
        <h4>{t("replayAnalysis.keyMoments")}</h4>
        {analysis.keyMoments.length === 0 ? (
          <p className="replay-analysis__hint">{t("replayAnalysis.noKeyMoments")}</p>
        ) : (
          <ol className="replay-analysis__moments">
            {analysis.keyMoments.map((moment, rank) => {
              const favored = getFavoredSeat(moment.swing);
              return (
                <li key={moment.turn} aria-current={currentTurn === moment ? "step" : undefined}>
                  <button type="button" onClick={() => onJump(moment.peakIndex)}>
                    <span className="replay-analysis__rank" aria-hidden="true">
                      {rank + 1}
                    </span>
                    <span className="replay-analysis__moment-text">
                      <strong>
                        {t("replayAnalysis.moment", { turn: moment.turn, name: replay.players[moment.seat]! })}
                      </strong>
                      <small>{describeReplayTurnChanges({ turn: moment, players: replay.players, t })}</small>
                    </span>
                    <span className="replay-analysis__swing" data-seat={favored}>
                      {t("replayAnalysis.swingFor", {
                        amount: formatSwing(moment.swing),
                        name: replay.players[favored]!,
                      })}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
        <p className="replay-analysis__hint">{t(source.help)}</p>
        {ratings && accuracies.some(Boolean) ? (
          <>
            <h4>{t("replayAnalysis.accuracy")}</h4>
            <ul className="replay-analysis__accuracy">
              {SEATS.map((seat) => {
                const accuracy = accuracies[seat];
                return (
                  <li key={seat} data-seat={seat}>
                    <span className="replay-analysis__seat-dot" aria-hidden="true" />
                    <span>{replay.players[seat]}</span>
                    {accuracy === undefined ? (
                      <small>{t("replayAnalysis.accuracyNone")}</small>
                    ) : (
                      <>
                        <strong>{accuracy.accuracy}%</strong>
                        <small>{t("replayAnalysis.accuracyRated", { count: accuracy.rated })}</small>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="replay-analysis__hint">{t("replayAnalysis.accuracyHelp")}</p>
          </>
        ) : null}
      </section>
    );
  }

  function renderTimeline() {
    return (
      <section className="replay-analysis__section" aria-labelledby="replay-analysis-timeline">
        <h3 id="replay-analysis-timeline">{t("replayAnalysis.tab.timeline")}</h3>
        <ul className="replay-analysis__legend" aria-label={t("replayAnalysis.legend")}>
          {STAT_COLUMNS.map((column) => (
            <li key={column.key}>
              <column.icon size={13} aria-hidden="true" />
              {t(column.label)}
              <HelpTip label={t(column.label)}>
                <strong>{t(column.label)}</strong>
                <p>{t(column.help)}</p>
              </HelpTip>
            </li>
          ))}
        </ul>
        <table className="replay-analysis__table">
          <thead>
            <tr>
              <th scope="col">{t("replayAnalysis.turn")}</th>
              <th scope="col">
                <span className="aegis-sr-only">{t("replayAnalysis.player")}</span>
              </th>
              {STAT_COLUMNS.map((column) => (
                <th key={column.key} scope="col" title={t(column.label)}>
                  <column.icon size={14} aria-hidden="true" />
                  <span className="aegis-sr-only">{t(column.label)}</span>
                </th>
              ))}
            </tr>
          </thead>
          {analysis.turns.map((turn) => (
            <tbody
              key={turn.turn}
              data-turning-point={turn.turningPoint || undefined}
              aria-current={currentTurn === turn ? "step" : undefined}
            >
              {SEATS.map((seat) => (
                <tr key={seat} data-seat={seat}>
                  {seat === 0 ? (
                    <th scope="rowgroup" rowSpan={2}>
                      <button
                        type="button"
                        title={t("replayAnalysis.moment", { turn: turn.turn, name: replay.players[turn.seat]! })}
                        onClick={() => onSeek(turn.startIndex)}
                      >
                        <span className="replay-analysis__turn-number">{turn.turn}</span>
                        <span className="replay-analysis__swing" data-seat={getFavoredSeat(turn.swing)}>
                          {turn.turningPoint ? (
                            <Zap size={11} role="img" aria-label={t("replayAnalysis.turningPoint")} />
                          ) : null}
                          {formatSwing(turn.swing)}
                        </span>
                      </button>
                    </th>
                  ) : null}
                  <th scope="row" className="replay-analysis__player" data-active={turn.seat === seat || undefined}>
                    <span className="replay-analysis__seat-dot" aria-hidden="true" />
                    <span>{replay.players[seat]}</span>
                    {ratings && worstQualities.has(`${turn.turn}:${seat}`) ? (
                      <ReplayDecisionQualityTip quality={worstQualities.get(`${turn.turn}:${seat}`)!} />
                    ) : null}
                  </th>
                  {STAT_COLUMNS.map((column) => (
                    <td key={column.key} data-changed={turn.changes[seat][column.key] !== 0 || undefined}>
                      {turn.players[seat][column.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
        <p className="replay-analysis__hint">{t("replayAnalysis.timelineHelp")}</p>
        <p className="replay-analysis__hint">{t("replayAnalysis.memoryHelp")}</p>
      </section>
    );
  }

  return (
    <aside ref={panel} id="replay-analysis" className="replay-analysis" aria-label={t("replayAnalysis.title")}>
      <header>
        <h2>{t("replayAnalysis.title")}</h2>
        <Button size="sm" variant="ghost" icon={Icons.X} aria-label={t("replayAnalysis.close")} onClick={onClose} />
      </header>
      <div className="replay-analysis__tabs" role="tablist" aria-label={t("replayAnalysis.tabs")}>
        {Object.values(ReplayAnalysisTab).map((entry) => (
          <button
            key={entry.value}
            type="button"
            role="tab"
            id={`replay-analysis-tab-${entry.value}`}
            aria-selected={tab === entry.value}
            aria-controls="replay-analysis-tabpanel"
            onClick={() => setTab(entry.value)}
          >
            {t(entry.label)}
          </button>
        ))}
      </div>
      <div id="replay-analysis-tabpanel" role="tabpanel" aria-labelledby={`replay-analysis-tab-${tab}`}>
        {tab === ReplayAnalysisTab.SUMMARY.value ? renderSummary() : null}
        {tab === ReplayAnalysisTab.TIMELINE.value ? renderTimeline() : null}
        {tab === ReplayAnalysisTab.DECISIONS.value ? (
          <ReplayDecisionList
            replay={replay}
            index={index}
            ratings={ratings}
            onRatingsChange={setRatings}
            onSeek={onSeek}
          />
        ) : null}
        {tab === ReplayAnalysisTab.PLAYERS.value ? <ReplayPlayersTab replay={replay} onSeek={onSeek} /> : null}
      </div>
    </aside>
  );
}
