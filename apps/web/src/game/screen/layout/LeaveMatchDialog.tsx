/* The browser Back button leaves the room, and the server counts a deliberate
   leave as a concession, so Back asks first during a live match. */

import { Icons } from "../../../design/icons";
import { useTranslation } from "../../../i18n";
import { MatchConfirmDialog } from "./MatchConfirmDialog";

export function LeaveMatchDialog({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <MatchConfirmDialog
      icon={<Icons.LogOut size={22} />}
      title={t("game.leaveConfirmTitle")}
      body={t("game.leaveConfirmBody")}
      confirmLabel={t("game.leaveMatch")}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
}
