import { useId } from "react";
import { historicalDeckFormats, releaseDateForSet, type DeckFormat } from "@aegis/shared";
import { useTranslation } from "../i18n";
import "./deckFormatSelector.css";

export function DeckFormatSelector({ value, onChange }: { value: DeckFormat; onChange: (format: DeckFormat) => void }) {
  const { t } = useTranslation();
  const id = useId();
  const date = releaseDateForSet(value);
  return (
    <div className="deck-format-selector">
      <label htmlFor={id}>{t("deckFormat.label")}</label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as DeckFormat)}
        aria-describedby={`${id}-summary`}
      >
        <option value="standard">{t("deckFormat.standard")}</option>
        <option value="unlimited">{t("lobby.unlimited")}</option>
        <option value="pauper">{t("deckFormat.pauper")}</option>
        <optgroup label={t("deckFormat.historical")}>
          {historicalDeckFormats()
            .reverse()
            .map((format) => (
              <option key={format} value={format}>
                {format} · {releaseDateForSet(format)}
              </option>
            ))}
        </optgroup>
      </select>
      <p id={`${id}-summary`}>
        {date
          ? t("deckFormat.snapshot", { set: value, date })
          : t(
              value === "pauper"
                ? "deckFormat.pauperHint"
                : value === "unlimited"
                  ? "deckFormat.unlimitedHint"
                  : "deckFormat.standardHint",
            )}
      </p>
    </div>
  );
}
