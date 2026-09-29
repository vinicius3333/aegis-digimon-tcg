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
      <span className="game-surrender-dialog__icon" aria-hidden="true">
        <Icons.Flag size={22} />
      </span>
      <h2 id={titleId} className="game-surrender-dialog__title">
        {t("game.surrenderConfirmTitle")}
      </h2>
      <p className="game-surrender-dialog__body">{t("game.surrenderConfirmBody")}</p>
      <div className="game-surrender-dialog__actions">
        <Button variant="secondary" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button variant="danger" className="game-surrender-dialog__confirm" onClick={onConfirm}>
          {t("game.surrender")}
        </Button>
      </div>
    </Dialog>
  );
}
