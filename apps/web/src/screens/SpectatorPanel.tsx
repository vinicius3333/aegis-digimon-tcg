import { useState } from "react";
import { Button, Dialog, Field } from "../design/primitives";
import { Icons } from "../design/icons";
import { useTranslation } from "../i18n";
import { spectatorCodeFromSearch } from "../roomInvite";

export function SpectatorPanel({ onWatch }: { onWatch: (code: string) => void }) {
  const { t } = useTranslation();
  const [code, setCode] = useState(() => spectatorCodeFromSearch(window.location.search) ?? "");
  const [open, setOpen] = useState(() => !!code);
  return (
    <>
      <Button
        className="lobby-spectator-action"
        variant="secondary"
        icon={Icons.Eye}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        {t("spectator.title")}
      </Button>
      {open ? (
        <Dialog labelledBy="spectator-join-title" onClose={() => setOpen(false)}>
          <h2 id="spectator-join-title">{t("spectator.title")}</h2>
          <form
            className="lobby-spectator__body"
            onSubmit={(event) => {
              event.preventDefault();
              if (code.length === 6) onWatch(code);
            }}
          >
            <Field
              label={t("spectator.code")}
              name="spectatorCode"
              autoComplete="off"
              spellCheck={false}
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z2-9]/g, ""))}
            />
            <Button type="submit" disabled={code.length !== 6}>
              {t("spectator.watch")}
            </Button>
          </form>
        </Dialog>
      ) : null}
    </>
  );
}
