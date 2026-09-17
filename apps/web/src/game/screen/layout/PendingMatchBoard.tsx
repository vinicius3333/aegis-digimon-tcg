/* The board before there is a board: reconnecting, a connection that failed, and the
   wait for a second player.

   The private host's room code is shown under the wait so it can be copied straight
   out of the screen the guest is being invited to. */

import { useTranslation } from "../../../i18n";
import { WaitingOverlay } from "../../overlay";
import { BoardShell } from "./BoardShell";

export function PendingMatchBoard({
  title,
  detail,
  spinner = true,
  actionLabel,
  roomCode,
  onAction,
}: {
  title: string;
  detail: string;
  /** A failure is not a wait, so it shows no spinner. */
  spinner?: boolean;
  actionLabel?: string;
  /** The code a guest joins this private room with, when there is one to share. */
  roomCode?: string;
  onAction?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <BoardShell>
      <WaitingOverlay spinner={spinner} title={title} detail={detail} actionLabel={actionLabel} onAction={onAction} />
      {roomCode ? (
        <div style={{ position: "absolute", bottom: 48, left: "50%", transform: "translateX(-50%)", zIndex: 81 }}>
          <code
            onClick={() => navigator.clipboard?.writeText(roomCode)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 32px",
              borderRadius: 14,
              background: "var(--ds-surface)",
              border: "1px solid var(--ds-border)",
              color: "var(--ds-foreground)",
              fontSize: 24,
              fontWeight: 800,
              fontFamily: "var(--ds-font-mono)",
              letterSpacing: "0.2em",
              cursor: "pointer",
            }}
            title={t("game.clickToCopy")}
          >
            {roomCode}
          </code>
        </div>
      ) : null}
    </BoardShell>
  );
}
