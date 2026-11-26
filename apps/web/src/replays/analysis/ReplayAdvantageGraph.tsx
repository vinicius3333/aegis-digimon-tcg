import { useId, useMemo, useRef, useState, type PointerEvent } from "react";
import type { MatchReplay } from "@aegis/shared/replays";
import type { ReplayDecisionPoint } from "@aegis/shared/replays/analysis/ReplayDecisionPoint";
import { ReplayDecisionQuality } from "@aegis/shared/replays/analysis/ReplayDecisionQuality";
import type { Seat } from "@aegis/shared/schema/enums";
import { HelpTip } from "@/design/HelpTip";
import { useTranslation } from "@/i18n/useTranslation";
import type { Translate } from "@/i18n/translationTypes";
import type { ReplayAnalysis, ReplayTurnStats } from "@/replays/analysis/buildReplayAnalysis";
import { describeReplayTurnChanges } from "@/replays/analysis/describeReplayTurnChanges";
import { getReplayDecisionOptionLabel } from "@/replays/analysis/getReplayDecisionOptionLabel";
import { ReplayAdvantageSource } from "@/replays/analysis/ReplayAdvantageSource";
import { ReplayDecisionQualityGlyph } from "@/replays/analysis/ReplayDecisionQualityGlyph";
import { ReplayGraphDetail } from "@/replays/analysis/ReplayGraphDetail";

type Props = {
  replay: MatchReplay;
  analysis: ReplayAnalysis;
  index: number;
  ratings: boolean;
  onSeek: (index: number) => void;
  onJump: (index: number) => void;
};

type Cluster = { seat: Seat; position: number; decisions: ReplayDecisionPoint[] };

const WIDTH = 1000;
const HEIGHT = 100;
const CLUSTER_DISTANCE = 0.05;
const QUALITY_ORDER = Object.values(ReplayDecisionQuality).map((entry) => entry.value);
const FLAGGED_QUALITIES = new Set<string>([
  ReplayDecisionQuality.INACCURACY.value,
  ReplayDecisionQuality.MISTAKE.value,
  ReplayDecisionQuality.BLUNDER.value,
]);

function clusterDecisions({ decisions, last }: { decisions: readonly ReplayDecisionPoint[]; last: number }) {
  const clusters: Cluster[] = [];
  for (const decision of decisions) {
    const position = decision.frameIndex / last;
    const nearby = clusters.find(
      (cluster) => cluster.seat === decision.seat && position - cluster.position < CLUSTER_DISTANCE,
    );
    if (nearby) {
      nearby.decisions.push(decision);
    } else {
      clusters.push({ seat: decision.seat, position, decisions: [decision] });
    }
  }
  return clusters;
}

function getWorstQuality(decisions: readonly ReplayDecisionPoint[]): ReplayDecisionQuality {
  return decisions
    .map((decision) => decision.quality!)
    .reduce((worst, quality) => (QUALITY_ORDER.indexOf(quality) > QUALITY_ORDER.indexOf(worst) ? quality : worst));
}

function getChance({ value, players, t }: { value: number; players: readonly string[]; t: Translate }) {
  const chance = Math.round(value * 100);
  return t("replayAnalysis.graph.chanceShort", {
    name: players[chance >= 50 ? 0 : 1]!,
    chance: Math.max(chance, 100 - chance),
  });
}

export function ReplayAdvantageGraph({ replay, analysis, index, ratings, onSeek, onJump }: Props) {
  const { t } = useTranslation();
  const graphId = useId();
  const surface = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number>();
  const [detail, setDetail] = useState<ReplayGraphDetail>(ReplayGraphDetail.TURNS.value);
  const last = Math.max(1, analysis.series.length - 1);
  const x = (frame: number) => (frame / last) * WIDTH;
  const y = (value: number) => (1 - value) * HEIGHT;
  const frames = useMemo(
    () =>
      detail === ReplayGraphDetail.ACTIONS.value
        ? analysis.series.map((_, frame) => frame)
        : [0, ...analysis.turns.map((turn) => turn.endIndex)],
    [analysis, detail],
  );
  const line = frames.map((frame) => `${x(frame).toFixed(1)},${y(analysis.series[frame]!).toFixed(1)}`).join(" ");
  const area = `0,${HEIGHT / 2} ${line} ${WIDTH},${HEIGHT / 2}`;
  const clusters = ratings
    ? clusterDecisions({
        decisions: (replay.decisions ?? []).filter(
          (decision) => decision.quality !== undefined && FLAGGED_QUALITIES.has(decision.quality),
        ),
        last,
      })
    : [];
  const source = Object.values(ReplayAdvantageSource).find((entry) => entry.value === analysis.source)!;
  const shown = hoverIndex ?? index;
  const shownTurn = analysis.turns.filter((turn) => turn.startIndex <= shown).at(-1);

  function getPointedIndex(event: PointerEvent<HTMLDivElement>) {
    const bounds = surface.current!.getBoundingClientRect();
    return Math.round(Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)) * last);
  }

  function renderTurnPoint(turn: ReplayTurnStats) {
    const value = analysis.series[turn.endIndex] ?? 0.5;
    const label = t("replayAnalysis.graph.turnPoint", { turn: turn.turn, name: replay.players[turn.seat]! });
    return (
      <span
        key={turn.turn}
        className="replay-analysis__graph-point"
        data-turning-point={turn.turningPoint || undefined}
        style={{ left: `${(turn.endIndex / last) * 100}%`, top: `${(1 - value) * 100}%` }}
      >
        <HelpTip label={label} trigger={<span aria-hidden="true" />} triggerClassName="replay-analysis__graph-dot">
          <strong>{label}</strong>
          {analysis.source === ReplayAdvantageSource.BOT.value ? (
            <p>{getChance({ value, players: replay.players, t })}</p>
          ) : null}
          {turn.turningPoint ? <p>{t("replayAnalysis.turningPoint")}</p> : null}
          <p>{describeReplayTurnChanges({ turn, players: replay.players, t }) || t("replayAnalysis.graph.noChange")}</p>
          <button type="button" className="replay-analysis__tip-action" onClick={() => onJump(turn.peakIndex)}>
            {t("replayAnalysis.graph.goToTurn", { turn: turn.turn })}
          </button>
        </HelpTip>
      </span>
    );
  }

  function renderCluster(cluster: Cluster) {
    const worst = getWorstQuality(cluster.decisions);
    const label = t("replayAnalysis.graph.decisions", {
      name: replay.players[cluster.seat]!,
      count: cluster.decisions.length,
    });
    return (
      <span
        key={`${cluster.seat}-${cluster.position}`}
        className="replay-analysis__graph-flag"
        data-seat={cluster.seat}
        style={{ left: `${cluster.position * 100}%` }}
      >
        <HelpTip
          label={label}
          triggerClassName="replay-analysis__graph-flag-trigger"
          trigger={
            <>
              <ReplayDecisionQualityGlyph quality={worst} />
              {cluster.decisions.length > 1 ? <small>{cluster.decisions.length}</small> : null}
            </>
          }
        >
          <strong>{label}</strong>
          <ul className="replay-analysis__tip-list">
            {cluster.decisions.map((decision) => {
              const chosen = decision.options[decision.chosen[0] ?? -1];
              return (
                <li key={decision.inputIndex}>
                  <ReplayDecisionQualityGlyph quality={decision.quality!} />
                  <span>
                    {t("replayAnalysis.players.turn", { turn: decision.turn })}
                    {chosen === undefined ? null : ` · ${getReplayDecisionOptionLabel({ option: chosen, t })}`}
                  </span>
                  <button
                    type="button"
                    className="replay-analysis__tip-action"
                    onClick={() => onSeek(decision.frameIndex)}
                  >
                    {t("replayAnalysis.graph.go")}
                  </button>
                </li>
              );
            })}
          </ul>
        </HelpTip>
      </span>
    );
  }

  return (
    <section className="replay-analysis__graph" aria-labelledby={`${graphId}-title`}>
      <header>
        <h4 id={`${graphId}-title`}>{t(source.label)}</h4>
        <div className="replay-analysis__graph-detail" role="group" aria-label={t("replayAnalysis.graph.detail")}>
          {Object.values(ReplayGraphDetail).map((entry) => (
            <button
              key={entry.value}
              type="button"
              aria-pressed={detail === entry.value}
              onClick={() => setDetail(entry.value)}
            >
              {t(entry.label)}
            </button>
          ))}
        </div>
      </header>
      <div
        ref={surface}
        className="replay-analysis__graph-surface"
        onPointerMove={(event) => setHoverIndex(getPointedIndex(event))}
        onPointerLeave={() => setHoverIndex(undefined)}
      >
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <clipPath id={`${graphId}-top`}>
              <rect x="0" y="0" width={WIDTH} height={HEIGHT / 2} />
            </clipPath>
            <clipPath id={`${graphId}-bottom`}>
              <rect x="0" y={HEIGHT / 2} width={WIDTH} height={HEIGHT / 2} />
            </clipPath>
          </defs>
          <polygon
            className="replay-analysis__graph-area"
            data-seat="0"
            points={area}
            clipPath={`url(#${graphId}-top)`}
          />
          <polygon
            className="replay-analysis__graph-area"
            data-seat="1"
            points={area}
            clipPath={`url(#${graphId}-bottom)`}
          />
          <line className="replay-analysis__graph-mid" x1="0" x2={WIDTH} y1={HEIGHT / 2} y2={HEIGHT / 2} />
          <polyline className="replay-analysis__graph-line" points={line} />
          <line className="replay-analysis__graph-cursor" x1={x(shown)} x2={x(shown)} y1="0" y2={HEIGHT} />
        </svg>
        <input
          type="range"
          min={0}
          max={last}
          value={Math.min(index, last)}
          aria-label={t("replayAnalysis.graph.position")}
          onChange={(event) => onSeek(Number(event.target.value))}
        />
        {analysis.turns.map(renderTurnPoint)}
        {clusters.map(renderCluster)}
      </div>
      <p className="replay-analysis__graph-readout" aria-live="polite">
        {[
          t("replayAnalysis.graph.action", { action: shown + 1 }),
          shownTurn === undefined ? undefined : t("replayAnalysis.players.turn", { turn: shownTurn.turn }),
          analysis.source === ReplayAdvantageSource.BOT.value
            ? getChance({ value: analysis.series[shown] ?? 0.5, players: replay.players, t })
            : undefined,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
      <div className="replay-analysis__graph-axis" aria-hidden="true">
        <span data-seat="0">{replay.players[0]}</span>
        <span data-seat="1">{replay.players[1]}</span>
      </div>
    </section>
  );
}
