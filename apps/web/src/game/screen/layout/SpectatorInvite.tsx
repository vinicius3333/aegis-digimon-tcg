import { useState } from "react";
import { Button, Dialog, Field } from "../../../design/primitives";
import { Icons } from "../../../design/icons";
import { useTranslation } from "../../../i18n";
import { spectatorInviteUrl } from "../../../roomInvite";

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
        <Dialog labelledBy="spectator-invite-title" onClose={() => setOpen(false)}>
          <h2 id="spectator-invite-title">{t("spectator.share")}</h2>
          <Field label={t("spectator.code")} value={code} readOnly />
          <Field label={t("spectator.link")} value={url} readOnly onFocus={(event) => event.target.select()} />
          <Button onClick={() => void copy()}>{t(copied ? "spectator.copied" : "spectator.copy")}</Button>
          {copyError ? <p role="status">{t("spectator.copyError")}</p> : null}
        </Dialog>
      ) : null}
    </>
  );
}
