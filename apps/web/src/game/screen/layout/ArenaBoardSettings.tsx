/* Board display choices for the match dialog. They share their stores with the
   Settings screen, so a change here shows on the board behind the dialog at once. */

import { TEXT_SCALES, setTextScale, useTextScale } from "../../../design/textScale";
import { useId } from "react";
import { setPileCountsShown, usePileCountsShown } from "../../../design/pileCounts";
import { Switch } from "../../../design/primitives";
import { useTranslation } from "../../../i18n";

export function ArenaBoardSettings({ onSortHand }: { onSortHand?: () => void }) {
  const { t } = useTranslation();
  const titleId = useId();
  const pileCountsShown = usePileCountsShown();
  const textScale = useTextScale();
  return (
    <section className="game-arena-board-settings" aria-labelledby={titleId}>
      <h3 id={titleId} className="game-arena-settings__title">
        {t("redesign.arena.board.title")}
      </h3>
      <div className="game-arena-settings__panel">
        {onSortHand ? (
          <div className="game-arena-settings__row game-arena-board-settings__sort">
            <button type="button" onClick={onSortHand}>
              {t("settings.sortHand")}
            </button>
            <p>{t("settings.sortHandDesc")}</p>
          </div>
        ) : null}
        <div className="game-arena-settings__row game-arena-board-settings__size">
          <label htmlFor={`${titleId}-text-size`}>{t("settings.textSize")}</label>
          <select
            id={`${titleId}-text-size`}
            value={textScale}
            onChange={(event) => {
              const scale = TEXT_SCALES.find((value) => value === event.target.value);
              if (scale) setTextScale(scale);
            }}
          >
            {TEXT_SCALES.map((scale) => (
              <option key={scale} value={scale}>
                {t(
                  scale === "default"
                    ? "settings.textSizeDefault"
                    : scale === "large"
                      ? "settings.textSizeLarge"
                      : "settings.textSizeLarger",
                )}
              </option>
            ))}
          </select>
        </div>
        <div className="game-arena-settings__row">
          <Switch
            checked={pileCountsShown}
            label={t("settings.pileCounts")}
            description={t("settings.pileCountsDesc")}
            onChange={setPileCountsShown}
          />
        </div>
      </div>
    </section>
  );
}
