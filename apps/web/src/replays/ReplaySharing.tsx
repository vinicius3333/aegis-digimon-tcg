import "./sharing.css";
import { useId, useState } from "react";
import type { SavedReplay } from "@aegis/shared";
import { Button, Dialog } from "../design/primitives";
import { useTranslation } from "../i18n";
import { replayApi, replayLink } from "./library";

export function ReplaySharing({ replay, onChange }: { replay: SavedReplay; onChange?: (replay: SavedReplay) => void }) {
  const { t } = useTranslation();
  const title = useId();
  const [open, setOpen] = useState(false);
  const [visibility, setVisibility] = useState(replay.visibility ?? "private");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  async function save() {
    setBusy(true);
    setError(false);
    try {
      const updated = await replayApi.visibility(replay.id, visibility);
      onChange?.(updated);
      setOpen(false);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => {
          setVisibility(replay.visibility ?? "private");
          setCopied(false);
          setError(false);
          setOpen(true);
        }}
      >
        {t(replay.visibility === "public" ? "replay.public" : "replay.private")} · {t("replay.share")}
      </Button>
      {open ? (
        <Dialog className="replay-sharing" labelledBy={title} onClose={busy ? undefined : () => setOpen(false)}>
          <h2 id={title}>{t("replay.share")}</h2>
          <fieldset disabled={busy}>
            <legend className="aegis-sr-only">{t("replay.share")}</legend>
            {(["private", "public"] as const).map((value) => (
              <label key={value} className="replay-sharing__choice">
                <input type="radio" name={title} checked={visibility === value} onChange={() => setVisibility(value)} />
                <span>
                  <strong>{t(`replay.${value}`)}</strong>
                  <small>{t(value === "private" ? "replay.privateHint" : "replay.publicHint")}</small>
                </span>
              </label>
            ))}
          </fieldset>
          <p>{t("replay.revokeHint")}</p>
          <label className="replay-sharing__link">
            {t("replay.link")}
            <input readOnly value={replayLink(replay.id)} onFocus={(event) => event.currentTarget.select()} />
          </label>
          <Button
            variant="secondary"
            disabled={busy || visibility !== (replay.visibility ?? "private")}
            onClick={() => {
              void navigator.clipboard
                .writeText(replayLink(replay.id))
                .then(() => setCopied(true))
                .catch(() => setError(true));
            }}
          >
            {t(copied ? "replay.copied" : "replay.copyLink")}
          </Button>
          {error ? <p role="alert">{t("replay.libraryError")}</p> : null}
          <footer>
            <Button variant="ghost" disabled={busy} onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button disabled={busy} onClick={() => void save()}>
              {t("common.save")}
            </Button>
          </footer>
        </Dialog>
      ) : null}
    </>
  );
}
