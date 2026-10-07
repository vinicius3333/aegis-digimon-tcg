import { MATCH_BEST_OF_OPTIONS, type MatchBestOf } from "@aegis/shared";
import { useId } from "react";
import { Icons } from "../design/icons";
import { useTranslation } from "../i18n";

/** The format row of the lobby's match rules, sitting above the timer row. */
export function MatchFormatSettings({
  bestOf,
  onChange,
}: {
  bestOf: MatchBestOf;
  onChange: (bestOf: MatchBestOf) => void;
}) {
  const { t } = useTranslation();
  const id = useId();
  return (
    <div className="lobby-format-settings">
      <div className="lobby-timer-settings__header">
        <span id={`${id}-label`} className="lobby-timer-settings__label">
          <span aria-hidden="true">
            <Icons.Trophy size={20} />
          </span>
          {t("lobby.format.label")}
        </span>
        <div
          className="lobby-private-toggle lobby-format-toggle"
          role="radiogroup"
          aria-labelledby={`${id}-label`}
          aria-describedby={`${id}-hint`}
        >
          {MATCH_BEST_OF_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={bestOf === option}
              className={bestOf === option ? "is-selected" : undefined}
              onClick={() => onChange(option)}
            >
              {t(option === 3 ? "lobby.format.bestOf3" : "lobby.format.bestOf1")}
            </button>
          ))}
        </div>
      </div>
      <p id={`${id}-hint`} className="lobby-timer-settings__hint">
        {t(bestOf === 3 ? "lobby.format.bestOf3Hint" : "lobby.format.bestOf1Hint")}
      </p>
    </div>
  );
}
