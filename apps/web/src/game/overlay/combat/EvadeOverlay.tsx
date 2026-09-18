import { useTranslation } from "../../../i18n";
import { KeywordSavePrompt } from "./KeywordSavePrompt";

export function EvadeOverlay({
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
      keyword="＜Evade＞"
      cardId={getCardId(permanentId)}
      rulesText={t("overlay.evadeRules")}
      acceptLabel={t("overlay.suspendToEvade")}
      declineLabel={t("overlay.letDeleted")}
      onAccept={onAccept}
      onDecline={onDecline}
    />
  );
}
