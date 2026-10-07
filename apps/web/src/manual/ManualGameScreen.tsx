import { useState } from "react";
import { Button, Dialog } from "../design/primitives";
import { useTranslation } from "../i18n";
import type { AegisJoinOptions } from "../net/types";
import { ManualBoard } from "./ManualBoard";
import { useManualRoom, type ManualStartMode } from "./useManualRoom";

export function ManualGameScreen({
  joinOptions,
  mode,
  roomCode,
  onExit,
}: {
  joinOptions: AegisJoinOptions;
  mode: ManualStartMode;
  roomCode?: string;
  onExit: () => void;
}) {
  const { t } = useTranslation();
  const room = useManualRoom(joinOptions, mode, roomCode);
  const [leaving, setLeaving] = useState(false);
  const exit = () => {
    room.leave();
    onExit();
  };
  if (!room.snapshot)
    return (
      <main className="manual-table">
        <h1>{t("manual.title")}</h1>
        <p role={room.error ? "alert" : "status"}>
          {room.error ?? t(room.status === "reconnecting" ? "manual.reconnecting" : "manual.connecting")}
        </p>
        <Button variant="secondary" onClick={exit}>
          {t("manual.leave")}
        </Button>
      </main>
    );
  return (
    <>
      <ManualBoard
        {...room}
        snapshot={room.snapshot}
        onExit={() =>
          room.snapshot!.phase === "over" || room.snapshot!.players.length < 2 ? exit() : setLeaving(true)
        }
      />
      {leaving ? (
        <Dialog labelledBy="manual-leave-title" onClose={() => setLeaving(false)}>
          <h2 id="manual-leave-title">{t("manual.concedeConfirm")}</h2>
          <Button onClick={exit}>{t("manual.concede")}</Button>
        </Dialog>
      ) : null}
    </>
  );
}
