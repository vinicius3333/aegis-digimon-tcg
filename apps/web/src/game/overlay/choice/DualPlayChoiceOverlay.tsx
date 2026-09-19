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
      title={t("overlay.useAsOption")}
      detail={getCardDefinition(cardId)?.optionEffect ?? t("overlay.dualPlayDetail")}
      confirmLabel={t("overlay.useAsOption")}
      onConfirm={() => onChoose("option")}
      onCancel={onCancel}
    />
  );
}
