import { useState } from "react";
import { Button, Field } from "../design/primitives";
import { Panel } from "../design/surfaces";
import { Icons } from "../design/icons";
import { useTranslation } from "../i18n";
import { spectatorCodeFromSearch } from "../roomInvite";

export function SpectatorPanel({ onWatch }: { onWatch: (code: string) => void }) {
  const { t } = useTranslation();
  const [code, setCode] = useState(() => spectatorCodeFromSearch(window.location.search) ?? "");
  const [open, setOpen] = useState(() => !!code);
  return (
    <Panel as="section" className="lobby-spectator" aria-label={t("spectator.title")}>
      <Button variant="secondary" icon={Icons.Eye} aria-expanded={open} onClick={() => setOpen(!open)}>
        {t("spectator.title")}
      </Button>
      {open ? (
        <form
          className="lobby-spectator__body"
          onSubmit={(event) => {
            event.preventDefault();
            if (code.length === 6) onWatch(code);
          }}
        >
          <p>{t("spectator.hint")}</p>
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
      ) : null}
    </Panel>
  );
}
