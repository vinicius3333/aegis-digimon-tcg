import { Button, Dialog } from "../../../design/primitives";
import { Icons } from "../../../design/icons";

export function WaitingOverlay({
  title,
  detail,
  spinner = true,
  actionLabel,
  onAction,
}: {
  title: string;
  detail: string;
  spinner?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Dialog className="waiting-dialog" labelledBy="aegis-waiting-title">
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
    </Dialog>
  );
}
