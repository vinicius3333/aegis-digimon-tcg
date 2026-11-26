import { useState } from "react";
import { Check, Star } from "lucide-react";
import type { MatchReplay } from "@aegis/shared/replays";
import { ReplayDecisionAction } from "@aegis/shared/replays/analysis/ReplayDecisionAction";
import { ReplayDecisionContext } from "@aegis/shared/replays/analysis/ReplayDecisionContext";
import type { ReplayDecisionOption, ReplayDecisionPoint } from "@aegis/shared/replays/analysis/ReplayDecisionPoint";
import { cardName } from "@/design/theme";
import { useTranslation } from "@/i18n/useTranslation";
import type { Translate } from "@/i18n/translationTypes";
import { Switch } from "@/design/primitives";
import { getReplayDecisionOptionLabel } from "@/replays/analysis/getReplayDecisionOptionLabel";
import { ReplayDecisionQualityTip } from "@/replays/analysis/ReplayDecisionQualityTip";
import { ReplayDecisionWhyTip } from "@/replays/analysis/ReplayDecisionWhyTip";

type Props = {
  replay: MatchReplay;
  index: number;
  ratings: boolean;
  onRatingsChange: (enabled: boolean) => void;
  onSeek: (index: number) => void;
};

type OptionProps = { option: ReplayDecisionOption; chosen: boolean; revealed: boolean; best: boolean };

function getContextLabel({ decision, t }: { decision: ReplayDecisionPoint; t: Translate }): string {
  const definition = Object.values(ReplayDecisionContext).find((entry) => entry.value === decision.context)!;
  const context = t(definition.label);
  return decision.sourceCardId === undefined ? context : `${context} · ${cardName(decision.sourceCardId)}`;
}

function DecisionOption({ option, chosen, revealed, best }: OptionProps) {
  const { t } = useTranslation();
  const showsRoute = option.action === ReplayDecisionAction.DIGIVOLVE.value && option.text !== undefined;
  return (
    <li data-chosen={chosen || undefined} data-best={(revealed && best) || undefined}>
      {chosen ? <Check size={14} role="img" aria-label={t("replayAnalysis.chosen")} /> : null}
      {revealed && best && !chosen ? <Star size={14} role="img" aria-label={t("replayAnalysis.bestOption")} /> : null}
      <span>
        {getReplayDecisionOptionLabel({ option, t })}
        {showsRoute ? <small className="replay-analysis__route">{option.text}</small> : null}
      </span>
      {revealed && option.value !== undefined ? (
        <span className="replay-analysis__value" title={t("replayAnalysis.valueHelp")}>
          {Math.round(option.value * 100)}%
        </span>
      ) : null}
      {option.cost === undefined ? null : (
        <span className="replay-analysis__cost" title={t("replayAnalysis.cost", { cost: option.cost })}>
          {option.cost}
        </span>
      )}
    </li>
  );
}

function getVerdictText({ decision, t }: { decision: ReplayDecisionPoint; t: Translate }): string {
  if (decision.loss === undefined || decision.loss <= 0) {
    return t("replayAnalysis.topPick");
  }
  return t("replayAnalysis.lostRange", {
    amount: Math.round(decision.loss * 100),
    margin: Math.round((decision.lossMargin ?? 0) * 100),
  });
}

export function ReplayDecisionList({ replay, index, ratings, onRatingsChange, onSeek }: Props) {
  const { t } = useTranslation();
  const [revealed, setRevealed] = useState<ReadonlySet<number>>(new Set());
  const turn = replay.frames[index]?.state.turnCount ?? 0;
  if (replay.decisions === undefined) {
    return <p className="replay-analysis__hint">{t("replayAnalysis.unavailable")}</p>;
  }
  const decisions = replay.decisions.filter((decision) => decision.turn === turn);
  const current = decisions.filter((decision) => decision.frameIndex <= index).at(-1);
  return (
    <section className="replay-analysis__section" aria-labelledby="replay-analysis-decisions">
      <h3 id="replay-analysis-decisions">{t("replayAnalysis.decisionsFor", { turn })}</h3>
      {replay.decisions.some((decision) => decision.quality !== undefined) ? (
        <div className="replay-analysis__experimental">
          <Switch
            checked={ratings}
            label={t("replayAnalysis.experimental")}
            description={t("replayAnalysis.experimentalHelp")}
            onChange={onRatingsChange}
          />
        </div>
      ) : null}
      {decisions.length === 0 ? <p className="replay-analysis__hint">{t("replayAnalysis.noDecisions")}</p> : null}
      <ol className="replay-analysis__decisions">
        {decisions.map((decision) => {
          const others = decision.options.flatMap((option, position) =>
            decision.chosen.includes(position) ? [] : [{ option, position }],
          );
          const shown = revealed.has(decision.inputIndex);
          const showPrompt =
            decision.prompt !== undefined &&
            (decision.sourceCardId === undefined || decision.prompt !== cardName(decision.sourceCardId));
          return (
            <li
              key={decision.inputIndex}
              data-seat={decision.seat}
              aria-current={decision === current ? "step" : undefined}
            >
              <button type="button" className="replay-analysis__decision" onClick={() => onSeek(decision.frameIndex)}>
                <span className="replay-analysis__seat-dot" aria-hidden="true" />
                <span className="replay-analysis__decision-title">
                  <strong>{replay.players[decision.seat]}</strong>
                  <small>{getContextLabel({ decision, t })}</small>
                </span>
                <small className="replay-analysis__action">
                  {t("replayAnalysis.decisionAt", { action: decision.frameIndex + 1 })}
                </small>
              </button>
              {showPrompt ? <p className="replay-analysis__prompt">{decision.prompt}</p> : null}
              <ul className="replay-analysis__options">
                {decision.chosen.length === 0 ? (
                  <li data-chosen>
                    <Check size={14} role="img" aria-label={t("replayAnalysis.chosen")} />
                    <span>{t("replayAnalysis.noSelection")}</span>
                  </li>
                ) : (
                  decision.chosen.map((position) => (
                    <DecisionOption
                      key={position}
                      option={decision.options[position]!}
                      chosen
                      revealed={shown}
                      best={position === decision.bestOption}
                    />
                  ))
                )}
              </ul>
              {decision.quality === undefined || !ratings ? null : (
                <div className="replay-analysis__verdict">
                  <ReplayDecisionQualityTip quality={decision.quality} />
                  <span>{getVerdictText({ decision, t })}</span>
                  <ReplayDecisionWhyTip decision={decision} />
                  {decision.bestOption === undefined ? null : (
                    <button
                      type="button"
                      aria-pressed={shown}
                      onClick={() =>
                        setRevealed((previous) => {
                          const next = new Set(previous);
                          if (shown) {
                            next.delete(decision.inputIndex);
                          } else {
                            next.add(decision.inputIndex);
                          }
                          return next;
                        })
                      }
                    >
                      {t(shown ? "replayAnalysis.hideBest" : "replayAnalysis.showBest")}
                    </button>
                  )}
                </div>
              )}
              {others.length === 0 ? (
                <p className="replay-analysis__hint">{t("replayAnalysis.onlyOption")}</p>
              ) : (
                <details
                  className="replay-analysis__alternatives"
                  open={decision.context === ReplayDecisionContext.MAIN.value || shown}
                >
                  <summary>{t("replayAnalysis.otherOptions", { count: others.length })}</summary>
                  <ul className="replay-analysis__options">
                    {others.map(({ option, position }) => (
                      <DecisionOption
                        key={position}
                        option={option}
                        chosen={false}
                        revealed={shown}
                        best={position === decision.bestOption}
                      />
                    ))}
                  </ul>
                </details>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
