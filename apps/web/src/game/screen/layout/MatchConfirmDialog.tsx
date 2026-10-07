/* A short, centred question before ending a turn or leaving a match. Cancel is the safe default. */

import { useId, type ReactNode } from "react";
import { Button, Dialog } from "../../../design/primitives";
import { useTranslation } from "../../../i18n";

export function MatchConfirmDialog({
  icon,
  title,
  body,
  confirmLabel,
  cancelLabel,
  tone = "danger",
  children,
  onConfirm,
  onClose,
}: {
  children?: ReactNode;
  icon: ReactNode;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "primary" | "danger";
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const titleId = useId();
  return (
    <Dialog className={`game-confirm-dialog game-confirm-dialog--${tone}`} labelledBy={titleId} onClose={onClose}>
      <span className="game-confirm-dialog__icon" aria-hidden="true">
        {icon}
      </span>
      <h2 id={titleId} className="game-confirm-dialog__title">
        {title}
      </h2>
      <p className="game-confirm-dialog__body">{body}</p>
      {children}
      <div className="game-confirm-dialog__actions">
        <Button variant="secondary" onClick={onClose}>
          {cancelLabel ?? t("common.cancel")}
        </Button>
        <Button variant={tone} className="game-confirm-dialog__confirm" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
