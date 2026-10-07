import { useState } from "react";
import { Icons } from "../../../design/icons";
import { useTranslation } from "../../../i18n";
import { MatchConfirmDialog } from "./MatchConfirmDialog";

export function EndTurnDialog({
  onConfirm,
  onClose,
}: {
  onConfirm: (skipFuture: boolean) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [skipFuture, setSkipFuture] = useState(false);
  return (
    <MatchConfirmDialog
      icon={<Icons.Clock size={22} />}
      title={t("game.endTurnConfirmTitle")}
      body={t("game.endTurnConfirmBody")}
      cancelLabel={t("game.keepPlaying")}
      confirmLabel={t("game.endTurn")}
      tone="primary"
      onConfirm={() => onConfirm(skipFuture)}
      onClose={onClose}
    >
      <label className="game-confirm-dialog__preference">
        <input type="checkbox" checked={skipFuture} onChange={(event) => setSkipFuture(event.target.checked)} />
        <span>{t("game.dontAskAgain")}</span>
      </label>
    </MatchConfirmDialog>
  );
}
