/* A short, centred question before an action that ends the match for the
   viewer. Cancel is the safe default. */

import { useId, type ReactNode } from "react";
import { Button, Dialog } from "../../../design/primitives";
import { useTranslation } from "../../../i18n";

export function MatchConfirmDialog({
  icon,
  title,
  body,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const titleId = useId();
  return (
    <Dialog className="game-confirm-dialog" labelledBy={titleId} onClose={onClose}>
      <span className="game-confirm-dialog__icon" aria-hidden="true">
        {icon}
      </span>
      <h2 id={titleId} className="game-confirm-dialog__title">
        {title}
      </h2>
      <p className="game-confirm-dialog__body">{body}</p>
      <div className="game-confirm-dialog__actions">
        <Button variant="secondary" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button variant="danger" className="game-confirm-dialog__confirm" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
