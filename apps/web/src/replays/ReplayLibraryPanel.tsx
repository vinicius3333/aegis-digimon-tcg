import { useEffect, useRef, useState } from "react";
import { MAX_SAVED_REPLAYS, type SavedReplay } from "@aegis/shared";
import { AccountApiError } from "../account/client";
import { Button } from "../design/primitives";
import { Icons } from "../design/icons";
import { useTranslation } from "../i18n";
import { downloadSavedReplay, replayApi, type ReplayLibraryView } from "./library";

export function ReplayLibraryPanel({ onOpen }: { onOpen: (file: Blob) => Promise<void> }) {
  const { t, locale } = useTranslation();
  const [library, setLibrary] = useState<ReplayLibraryView>();
  const [guest, setGuest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState<string>();
  const [confirmDelete, setConfirmDelete] = useState<string>();
  const alive = useRef(true);
  async function refresh() {
    setError(false);
    setLoading(true);
    try {
      const next = await replayApi.list();
      if (alive.current) {
        setLibrary(next);
        setGuest(false);
      }
    } catch (cause) {
      if (alive.current) {
        if (cause instanceof AccountApiError && cause.status === 401) setGuest(true);
        else setError(true);
      }
    } finally {
      if (alive.current) setLoading(false);
    }
  }
  useEffect(() => {
    alive.current = true;
    void refresh();
    return () => {
      alive.current = false;
    };
  }, []);
  async function act(item: SavedReplay, action: "open" | "download" | "delete") {
    setBusy(item.id);
    setError(false);
    try {
      if (action === "delete") {
        await replayApi.remove(item.id);
        setConfirmDelete(undefined);
        await refresh();
      } else {
        const file = await replayApi.file(item.id);
        if (action === "open") await onOpen(file);
        else downloadSavedReplay(item.id, file);
      }
    } catch {
      if (alive.current) {
        setError(true);
        await refresh();
        setError(true);
      }
    } finally {
      if (alive.current) setBusy(undefined);
    }
  }
  return (
    <section className="replay-library" aria-labelledby="replay-library-title">
      <header>
        <div>
          <h2 id="replay-library-title">{t("replay.library")}</h2>
          <p>{t("replay.libraryHint", { limit: MAX_SAVED_REPLAYS })}</p>
        </div>
        <span className="replay-library__count">
          {library?.replays.length ?? 0} / {MAX_SAVED_REPLAYS}
        </span>
      </header>
      {loading ? <p role="status">{t("replay.libraryLoading")}</p> : null}
      {guest ? <p>{t("replay.librarySignIn")}</p> : null}
      {error ? (
        <div role="alert">
          <p>{t("replay.libraryError")}</p>
          <Button size="sm" variant="secondary" onClick={() => void refresh()}>
            {t("replay.retry")}
          </Button>
        </div>
      ) : null}
      {library && !loading && !library.enabled ? <p>{t("replay.libraryDisabled")}</p> : null}
      {library?.enabled && !loading && !library.replays.length ? <p>{t("replay.libraryEmpty")}</p> : null}
      <ul>
        {library?.replays.map((item) => (
          <li key={item.id}>
            <div className="replay-library__match">
              <strong>
                {item.summary.players[0]} <span>vs</span> {item.summary.players[1]}
              </strong>
              <small>
                {new Date(item.summary.finishedAt).toLocaleDateString(locale)} · {Math.ceil(item.bytes / 1024)} KB ·{" "}
                {item.summary.winnerSeat < 0
                  ? t("replay.draw")
                  : t("replay.winner", { name: item.summary.players[item.summary.winnerSeat] ?? "" })}
              </small>
              {item.status !== "ready" ? (
                <small role="status">{t(item.status === "pending" ? "replay.pending" : "replay.deleting")}</small>
              ) : null}
            </div>
            <div className="replay-library__actions">
              {confirmDelete === item.id ? (
                <>
                  <span>{t("replay.deleteConfirm")}</span>
                  <Button size="sm" disabled={busy !== undefined} onClick={() => void act(item, "delete")}>
                    {t("replay.delete")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(undefined)}>
                    {t("replay.cancel")}
                  </Button>
                </>
              ) : (
                <>
                  {item.status === "ready" ? (
                    <>
                      <Button
                        size="sm"
                        icon={Icons.Play}
                        disabled={busy !== undefined}
                        onClick={() => void act(item, "open")}
                      >
                        {t("replay.openAction")}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={Icons.Download}
                        disabled={busy !== undefined}
                        onClick={() => void act(item, "download")}
                      >
                        {t("replay.download")}
                      </Button>
                    </>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={Icons.Trash}
                    disabled={busy !== undefined}
                    onClick={() => setConfirmDelete(item.id)}
                  >
                    {t("replay.delete")}
                  </Button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
