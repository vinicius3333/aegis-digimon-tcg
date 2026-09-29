/* Surrendering ends the match at once and cannot be taken back, so the button
   asks first. Cancel is the safe default. */

import { useId } from "react";
import { Button, Dialog } from "../../../design/primitives";
import { Icons } from "../../../design/icons";
import { useTranslation } from "../../../i18n";

export function SurrenderDialog({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) {
  const { t } = useTranslation();
  const titleId = useId();
  return (
    <Dialog className="game-surrender-dialog" labelledBy={titleId} onClose={onClose}>
      <header className="aegis-dialog__header">
        <h2 id={titleId}>{t("game.surrenderConfirmTitle")}</h2>
        <p>{t("game.surrenderConfirmBody")}</p>
      </header>
      <footer className="game-surrender-dialog__actions">
        <Button variant="secondary" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button variant="danger" icon={Icons.LogOut} onClick={onConfirm}>
          {t("game.surrender")}
        </Button>
      </footer>
    </Dialog>
  );
}
