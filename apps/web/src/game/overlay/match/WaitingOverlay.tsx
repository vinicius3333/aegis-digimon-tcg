import type { ReactNode } from "react";
import { Button, Dialog } from "../../../design/primitives";
import { Icons } from "../../../design/icons";

export function WaitingOverlay({
  title,
  detail,
  spinner = true,
  actionLabel,
  onAction,
  aside,
  cancelLabel,
  onCancel,
}: {
  title: string;
  detail: string;
  spinner?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  /** A side panel, such as the private host's invite panel; it sits beside the wait on
      desktop and under it in the mobile bottom sheet. */
  aside?: ReactNode;
  cancelLabel?: string;
  onCancel?: () => void;
}) {
  return (
    <Dialog className={`waiting-dialog${aside ? " waiting-dialog--with-aside" : ""}`} labelledBy="aegis-waiting-title">
      <div className="waiting-dialog__handle" aria-hidden="true" />
      <div className="waiting-dialog__status">
        {spinner ? (
          <div className="waiting-dialog__spinner" />
        ) : (
          <div className="waiting-dialog__error">
            <Icons.CircleAlert size={30} />
          </div>
        )}
        <h2 id="aegis-waiting-title">{title}</h2>
        <p>{detail}</p>
        {actionLabel && onAction ? (
          <Button full variant="secondary" onClick={onAction}>
            {actionLabel}
          </Button>
        ) : null}
      </div>
      {aside ? <div className="waiting-dialog__aside">{aside}</div> : null}
      {cancelLabel && onCancel ? (
        <button type="button" className="waiting-dialog__cancel" onClick={onCancel}>
          {cancelLabel}
        </button>
      ) : null}
    </Dialog>
  );
}
