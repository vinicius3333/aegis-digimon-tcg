import { useState } from "react";
import { Button, Dialog, Field } from "../../../design/primitives";
import { Icons } from "../../../design/icons";
import { useTranslation } from "../../../i18n";
import { spectatorInviteUrl } from "../../../roomInvite";
import "./SpectatorInvite.css";

export function SpectatorInvite({
  code,
  variant = "desktop",
}: {
  code: string;
  variant?: "desktop" | "mobile" | "menu";
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const url = spectatorInviteUrl(code);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopyError(true);
    }
  };
  return (
    <>
      <button
        type="button"
        className={variant === "menu" ? undefined : variant === "mobile" ? "game-mobile-share" : "game-topbar-button"}
        aria-label={t("spectator.share")}
        title={t("spectator.share")}
        onClick={() => {
          setCopied(false);
          setCopyError(false);
          setOpen(true);
        }}
      >
        <Icons.Link2 size={variant === "menu" ? 18 : variant === "mobile" ? 16 : 17} />
        {variant === "menu" ? t("spectator.share") : null}
      </button>
      {open ? (
        <Dialog className="spectator-invite" labelledBy="spectator-invite-title" onClose={() => setOpen(false)}>
          <header className="aegis-dialog__header spectator-invite__header">
            <h2 id="spectator-invite-title">{t("spectator.share")}</h2>
            <button
              type="button"
              className="aegis-dialog__close"
              aria-label={t("common.close")}
              onClick={() => setOpen(false)}
            >
              <Icons.X size={18} />
            </button>
          </header>
          <div className="spectator-invite__body">
            <Field label={t("spectator.code")} value={code} readOnly onFocus={(event) => event.target.select()} />
            <Field label={t("spectator.link")} value={url} readOnly onFocus={(event) => event.target.select()} />
            {copyError ? (
              <p className="spectator-invite__status" role="status">
                {t("spectator.copyError")}
              </p>
            ) : null}
          </div>
          <footer className="spectator-invite__actions">
            <Button icon={copied ? Icons.Check : Icons.Copy} onClick={() => void copy()}>
              {t(copied ? "spectator.copied" : "spectator.copy")}
            </Button>
          </footer>
        </Dialog>
      ) : null}
    </>
  );
}
