import { useTranslation } from "../../../i18n";
import { KeywordSavePrompt } from "./KeywordSavePrompt";

export function BarrierOverlay({
  permanentId,
  getCardId,
  onAccept,
  onDecline,
}: {
  permanentId: string;
  getCardId: (permanentId: string) => string | undefined;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const { t } = useTranslation();
  return (
    <KeywordSavePrompt
      keyword="＜Barrier＞"
      cardId={getCardId(permanentId)}
      rulesText={t("overlay.barrierRules")}
      acceptLabel={t("overlay.trashSecurity")}
      declineLabel={t("overlay.letDeleted")}
      onAccept={onAccept}
      onDecline={onDecline}
    />
  );
}
