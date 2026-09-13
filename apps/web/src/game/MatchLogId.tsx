import { useState } from "react";
import { useTranslation } from "../i18n";

export function MatchLogId({ id }: { id: string }) {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
  if (!id) return null;
  return (
    <div className="match-log-id">
      <label>
        {t("game.debugId")}{" "}
        <input aria-label={t("game.debugId")} value={id} readOnly onFocus={(event) => event.currentTarget.select()} />
      </label>
      <button
        type="button"
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
      </button>
      <span role="status">{message}</span>
    </div>
  );
}
