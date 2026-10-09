import { getCardDefinition } from "@aegis/shared";
import { useTranslation } from "../../../i18n";
import { playerFacingEffectClause } from "../effectText";
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
  const timing = text?.includes("[Your Turn]") ? "YourTurn" : "AllTurns";
  // Every activation shares one heading, so the body names which copy is asking.
  const clause = playerFacingEffectClause({ cardId: expander.cardId, timing, description: undefined });
  const contextText = copyCount > 1 ? (clause ? `${displayName}: ${clause}` : displayName) : undefined;
  return (
    <div className="digi-xros-expander-layer">
      <DecisionOverlay
        request={{
          decisionId: `prepare-digixros-${expander.permanentId}`,
          seat: 0,
          kind: "optional",
          promptText: t("overlay.xrosUseTamerEffect", { name: displayName }),
          options: { timing },
        }}
        contextText={contextText}
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
