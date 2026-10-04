import { getCardDefinition } from "@aegis/shared";
import { useTranslation } from "../../../i18n";
import { printedCardName } from "../printedCardName";
import type { DigiXrosEligibleExpander } from "../types";
import { DecisionOverlay } from "./DecisionOverlay";

/** Local play preparation: accepting reserves the Tamer cost until the play is confirmed. */
export function DigiXrosExpanderPrompt({
  expander,
  copyIndex,
  copyCount,
  onAnswer,
}: {
  expander: DigiXrosEligibleExpander;
  copyIndex: number;
  copyCount: number;
  onAnswer: (accept: boolean) => void;
}) {
  const { t } = useTranslation();
  const text = getCardDefinition(expander.cardId)?.effectText;
  const name = printedCardName(expander.cardId);
  const displayName =
    copyCount > 1 ? `${name} (${t("overlay.cardCopy", { index: copyIndex, total: copyCount })})` : name;
  return (
    <div className="digi-xros-expander-layer">
      <DecisionOverlay
        request={{
          decisionId: `prepare-digixros-${expander.permanentId}`,
          seat: 0,
          kind: "optional",
          promptText: t("overlay.xrosUseTamerEffect", { name: displayName }),
          options: { timing: text?.includes("[Your Turn]") ? "YourTurn" : "AllTurns" },
        }}
        sourceCardId={expander.cardId}
        candidates={[]}
        picks={[]}
        onTogglePick={() => {}}
        onRespond={(response) => {
          if (response.kind === "optional") onAnswer(response.accept);
        }}
      />
    </div>
  );
}
