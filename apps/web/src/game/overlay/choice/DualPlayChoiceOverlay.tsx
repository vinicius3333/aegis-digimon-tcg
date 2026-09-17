import { getCardDefinition } from "@aegis/shared";
import { useTranslation } from "../../../i18n";
import { ActionConfirmationOverlay } from "./ActionConfirmationOverlay";

export function DualPlayChoiceOverlay({
  cardId,
  onChoose,
  onCancel,
}: {
  cardId: string;
  onChoose: (useAs: "digimon" | "option") => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  return (
    <ActionConfirmationOverlay
      cardId={cardId}
      title={t("overlay.dualPlayTitle")}
      detail={getCardDefinition(cardId)?.optionEffect ?? t("overlay.dualPlayDetail")}
      confirmLabel={t("overlay.playAsDigimon")}
      alternateLabel={t("overlay.useAsOption")}
      onConfirm={() => onChoose("digimon")}
      onAlternate={() => onChoose("option")}
      onCancel={onCancel}
    />
  );
}
