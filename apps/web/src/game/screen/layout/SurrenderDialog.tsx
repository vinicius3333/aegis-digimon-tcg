import { Icons } from "../../../design/icons";
import { useTranslation } from "../../../i18n";
import { MatchConfirmDialog } from "./MatchConfirmDialog";

export function SurrenderDialog({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <MatchConfirmDialog
      icon={<Icons.Flag size={22} />}
      title={t("game.surrenderConfirmTitle")}
      body={t("game.surrenderConfirmBody")}
      confirmLabel={t("game.surrender")}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
}
