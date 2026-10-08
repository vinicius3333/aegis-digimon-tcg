import { useEffect, useRef, useState } from "react";
import { Button, Dialog } from "../design/primitives";
import { useTranslation } from "../i18n";
import { captureReplayVideo, mp4MimeType, type ReplayVideoCapture } from "./video";
import "./sharing.css";

export function ReplayVideoExport({
  replayId,
  requested,
  finished,
  onPrepare,
  onStart,
  onStop,
}: {
  replayId: string;
  requested?: boolean;
  finished: boolean;
  onPrepare: () => void;
  onStart: () => void;
  onStop: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(requested ?? false);
  const [phase, setPhase] = useState<"idle" | "picking" | "recording">("idle");
  const [failure, setFailure] = useState<"failed" | "limit">();
  const [download, setDownload] = useState<string>();
  const capture = useRef<ReplayVideoCapture | undefined>(undefined);
  const alive = useRef(true);
  const link = useRef<string | undefined>(undefined);
  const callbacks = useRef({ onPrepare, onStart, onStop });
  callbacks.current = { onPrepare, onStart, onStop };
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      capture.current?.cancel();
      if (link.current) URL.revokeObjectURL(link.current);
    };
  }, []);
  useEffect(() => {
    if (phase === "recording" && finished) capture.current?.finish();
  }, [phase, finished]);
  async function start() {
    setFailure(undefined);
    setPhase("picking");
    try {
      const next = await captureReplayVideo({
        complete(blob) {
          if (!alive.current) return;
          if (link.current) URL.revokeObjectURL(link.current);
          link.current = URL.createObjectURL(blob);
          setDownload(link.current);
          setPhase("idle");
          setOpen(true);
          callbacks.current.onStop();
          const anchor = document.createElement("a");
          anchor.href = link.current;
          anchor.download = `aegis-${replayId}.mp4`;
          anchor.click();
        },
        fail(reason) {
          if (alive.current) {
            setFailure(reason);
            setPhase("idle");
            setOpen(true);
            callbacks.current.onStop();
          }
        },
      });
      if (!alive.current) {
        next.cancel();
        return;
      }
      capture.current = next;
      callbacks.current.onPrepare();
      setOpen(false);
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      if (!alive.current) {
        next.cancel();
        return;
      }
      next.start();
      setPhase("recording");
      callbacks.current.onStart();
    } catch {
      capture.current?.cancel();
      if (alive.current) {
        setFailure("failed");
        setPhase("idle");
        setOpen(true);
        callbacks.current.onStop();
      }
    }
  }
  function cancel() {
    capture.current?.cancel();
    setPhase("idle");
    callbacks.current.onStop();
  }
  return (
    <>
      <div className="replay-video-control">
        {phase === "recording" ? (
          <>
            <span role="status">{t("replay.mp4Recording")}</span>
            <Button size="sm" variant="danger" onClick={cancel}>
              {t("replay.mp4Cancel")}
            </Button>
          </>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
            {t("replay.mp4")}
          </Button>
        )}
      </div>
      {open ? (
        <Dialog
          className="replay-sharing"
          labelledBy="replay-video-title"
          onClose={phase === "picking" ? undefined : () => setOpen(false)}
        >
          <h2 id="replay-video-title">{t("replay.mp4")}</h2>
          <p>{t(mp4MimeType() ? "replay.mp4Hint" : "replay.mp4Unsupported")}</p>
          {failure ? <p role="alert">{t(failure === "limit" ? "replay.mp4Limit" : "replay.mp4Error")}</p> : null}
          {download ? (
            <p role="status">
              {t("replay.mp4Done")}{" "}
              <a href={download} download={`aegis-${replayId}.mp4`}>
                {t("replay.mp4")}
              </a>
            </p>
          ) : null}
          <footer>
            <Button variant="ghost" disabled={phase === "picking"} onClick={() => setOpen(false)}>
              {t("common.close")}
            </Button>
            <Button disabled={phase === "picking" || !mp4MimeType()} onClick={() => void start()}>
              {t("replay.mp4Start")}
            </Button>
          </footer>
        </Dialog>
      ) : null}
    </>
  );
}
