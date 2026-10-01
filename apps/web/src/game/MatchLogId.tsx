import { IconButton } from "../design/primitives";
import { Icons } from "../design/icons";
import { useId, useState } from "react";
import { useTranslation } from "../i18n";

export function MatchLogId({ id }: { id: string }) {
  const { t } = useTranslation();
  const inputId = useId();
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  if (!id) return null;
  return (
    <div className="aegis-field bug-report__match-id">
      <label className="aegis-field__label" htmlFor={inputId}>
        {t("game.debugId")}
      </label>
      <div className="bug-report__match-id-row">
        <input
          id={inputId}
          className="aegis-field__control"
          value={id}
          readOnly
          onFocus={(event) => event.currentTarget.select()}
        />
        <IconButton
          variant="secondary"
          label={t("common.copy")}
          title={t("common.copy")}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(id);
              setCopied(true);
              setMessage(t("common.copied"));
            } catch {
              setCopied(false);
              setMessage(t("game.debugCopyFailed"));
            }
          }}
        >
          {copied ? <Icons.Check size={16} /> : <Icons.Copy size={16} />}
        </IconButton>
      </div>
      {/* The check icon already shows a successful copy, so only a failure takes up a line. */}
      <span className={copied || !message ? "aegis-sr-only" : "aegis-field__message"} role="status">
        {message}
      </span>
    </div>
  );
}
