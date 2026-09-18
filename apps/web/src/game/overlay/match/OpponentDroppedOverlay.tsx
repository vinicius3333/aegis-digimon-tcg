import { useEffect, useState } from "react";
import { RECONNECT_GRACE_SECONDS } from "@aegis/shared";
import { useTranslation } from "../../../i18n";
import { WaitingOverlay } from "./WaitingOverlay";

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/* Shown over the board while the opponent's socket is gone. The server owns the
   reconnect grace clock; this countdown starts when the client first sees the seat
   drop, so it can run a second or two behind the server and never ahead of it. */
export function OpponentDroppedOverlay() {
  const { t } = useTranslation();
  const [deadline] = useState(() => Date.now() + RECONNECT_GRACE_SECONDS * 1000);
  const [remainingSeconds, setRemainingSeconds] = useState(RECONNECT_GRACE_SECONDS);
  useEffect(() => {
    const tick = () => setRemainingSeconds(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [deadline]);
  const detail =
    remainingSeconds > 0
      ? `${t("game.opponentDisconnectedDetail")} ${t("game.opponentDisconnectedCountdown", { time: formatCountdown(remainingSeconds) })}`
      : t("game.opponentDisconnectedExpired");
  return <WaitingOverlay title={t("game.opponentDisconnected")} detail={detail} />;
}
