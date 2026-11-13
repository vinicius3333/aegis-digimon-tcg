import { useTranslatedCardName } from "@/i18n/useTranslatedCardName";
import { DecisionCardNumber } from "@/game/overlay/choice/DecisionCardNumber";

type Params = { cardId: string };

export function DecisionCardCaption({ cardId }: Params) {
  const getCardName = useTranslatedCardName();
  return (
    <>
      <span className="decision-overlay__candidate-name">{getCardName(cardId)}</span>
      <DecisionCardNumber cardId={cardId} />
    </>
  );
}
