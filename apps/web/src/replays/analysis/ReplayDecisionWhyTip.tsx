import type { ReplayDecisionOption, ReplayDecisionPoint } from "@aegis/shared/replays/analysis/ReplayDecisionPoint";
import { ReplayEvaluationFactor } from "@aegis/shared/replays/analysis/ReplayEvaluationFactor";
import { HelpTip } from "@/design/HelpTip";
import { useTranslation } from "@/i18n/useTranslation";
import type { Translate } from "@/i18n/translationTypes";
import { buildDecisionExplanation, type ReplayFactorDifference } from "@/replays/analysis/buildDecisionExplanation";
import { getReplayDecisionOptionLabel } from "@/replays/analysis/getReplayDecisionOptionLabel";

type Props = { decision: ReplayDecisionPoint };
type LineParams = {
  entry: ReplayFactorDifference;
  reference: ReplayDecisionOption;
  chosen: ReplayDecisionOption;
  t: Translate;
};

function getFactorLine({ entry, reference, chosen, t }: LineParams): string {
  const referenceFacts = reference.facts;
  const chosenFacts = chosen.facts;
  if (referenceFacts !== undefined && chosenFacts !== undefined) {
    if (entry.factor === ReplayEvaluationFactor.SECURITY.value) {
      return t("replayAnalysis.why.security", {
        ownReference: referenceFacts.ownSecurity,
        ownChosen: chosenFacts.ownSecurity,
        opponentReference: referenceFacts.opponentSecurity,
        opponentChosen: chosenFacts.opponentSecurity,
      });
    }
    if (entry.factor === ReplayEvaluationFactor.BOARD.value) {
      return t("replayAnalysis.why.board", {
        ownReference: referenceFacts.ownDigimon,
        ownChosen: chosenFacts.ownDigimon,
        opponentReference: referenceFacts.opponentDigimon,
        opponentChosen: chosenFacts.opponentDigimon,
      });
    }
    if (entry.factor === ReplayEvaluationFactor.HAND.value) {
      return t("replayAnalysis.why.hand", { reference: referenceFacts.ownHand, chosen: chosenFacts.ownHand });
    }
    if (entry.factor === ReplayEvaluationFactor.MEMORY.value) {
      return t("replayAnalysis.why.memory", { reference: referenceFacts.memory, chosen: chosenFacts.memory });
    }
  }
  const definition = Object.values(ReplayEvaluationFactor).find((factor) => factor.value === entry.factor)!;
  return t(entry.difference > 0 ? "replayAnalysis.why.stronger" : "replayAnalysis.why.weaker", {
    factor: t(definition.label),
  });
}

function getEstimate({ option, t }: { option: ReplayDecisionOption; t: Translate }): string {
  return t("replayAnalysis.why.estimate", {
    option: getReplayDecisionOptionLabel({ option, t }),
    value: Math.round((option.value ?? 0) * 100),
    margin: Math.round((option.margin ?? 0) * 100),
    samples: option.samples ?? 0,
  });
}

export function ReplayDecisionWhyTip({ decision }: Props) {
  const { t } = useTranslation();
  const explanation = buildDecisionExplanation({ decision });
  if (explanation === undefined) {
    return null;
  }
  const { chosen, reference, referenceIsBest, factors } = explanation;
  return (
    <HelpTip label={t("replayAnalysis.why.title")}>
      <strong>{t("replayAnalysis.why.title")}</strong>
      <p>
        {t(referenceIsBest ? "replayAnalysis.why.compareBest" : "replayAnalysis.why.compareRunnerUp", {
          option: getReplayDecisionOptionLabel({ option: reference, t }),
        })}
      </p>
      {factors.length === 0 ? (
        <p>{t("replayAnalysis.why.noFactors")}</p>
      ) : (
        <ul className="replay-analysis__why">
          {factors.map((entry) => (
            <li key={entry.factor}>{getFactorLine({ entry, reference, chosen, t })}</li>
          ))}
        </ul>
      )}
      <p className="replay-analysis__tip-note">{getEstimate({ option: chosen, t })}</p>
      <p className="replay-analysis__tip-note">{getEstimate({ option: reference, t })}</p>
      <p className="replay-analysis__tip-note">{t("replayAnalysis.qualityNote")}</p>
    </HelpTip>
  );
}
