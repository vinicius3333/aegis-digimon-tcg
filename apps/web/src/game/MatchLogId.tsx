import { Button } from "../design/primitives";
import { useState } from "react";
import { useTranslation } from "../i18n";

export function MatchLogId({ id }: { id: string }) {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
  if (!id) return null;
  return (
    <div className="aegis-field bug-report__match-id">
      <label className="aegis-field__label">
        {t("game.debugId")}{" "}
        <input
          className="aegis-field__control"
          aria-label={t("game.debugId")}
          value={id}
          readOnly
          onFocus={(event) => event.currentTarget.select()}
        />
      </label>
      <Button
        variant="secondary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(id);
            setMessage(t("common.copied"));
          } catch {
            setMessage(t("game.debugCopyFailed"));
          }
        }}
      >
        {t("common.copy")}
      </Button>
      <span className="aegis-field__message" role="status">
        {message}
      </span>
    </div>
  );
}
