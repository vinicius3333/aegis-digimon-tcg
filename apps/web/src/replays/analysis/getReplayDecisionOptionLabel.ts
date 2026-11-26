import { ReplayDecisionAction } from "@aegis/shared/replays/analysis/ReplayDecisionAction";
import type { ReplayDecisionOption } from "@aegis/shared/replays/analysis/ReplayDecisionPoint";
import { cardName } from "@/design/theme";
import type { Translate } from "@/i18n/translationTypes";

type Params = { option: ReplayDecisionOption; t: Translate };

export function getReplayDecisionOptionLabel({ option, t }: Params): string {
  const definition = Object.values(ReplayDecisionAction).find((entry) => entry.value === option.action)!;
  const unknown = t("replayAnalysis.unknownCard");
  return t(definition.label, {
    card: option.cardId === undefined ? unknown : cardName(option.cardId),
    target: option.targetCardId === undefined ? unknown : cardName(option.targetCardId),
    text: option.text ?? "",
  });
}
