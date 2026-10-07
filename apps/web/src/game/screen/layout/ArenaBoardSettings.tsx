/* Board display choices for the match dialog. They share their stores with the
   Settings screen, so a change here shows on the board behind the dialog at once. */

import { EFFECT_PROMPT_POSITIONS, setEffectPromptPosition, useEffectPromptPosition } from "../../effectPromptPosition";
import { TEXT_SCALES, setTextScale, useTextScale } from "../../../design/textScale";
import { useId, useState } from "react";
import { setPileCountsShown, usePileCountsShown } from "../../../design/pileCounts";
import { Switch } from "../../../design/primitives";
import { SEQUENTIAL_PACING_ENABLED } from "../../../features";
import { useTranslation, type TranslationKey } from "../../../i18n";
import { setHandAutoSortEnabled, useHandAutoSort } from "../../handAutoSort";
import { EFFECT_SPEEDS, getEffectSpeed, setEffectSpeed, type EffectSpeed } from "../../pacing";

const EFFECT_SPEED_LABELS: Record<EffectSpeed, TranslationKey> = {
  slow: "settings.effectSpeedSlow",
  normal: "settings.effectSpeedNormal",
  fast: "settings.effectSpeedFast",
};

export function ArenaBoardSettings() {
  const { t } = useTranslation();
  const titleId = useId();
  const pileCountsShown = usePileCountsShown();
  const textScale = useTextScale();
  const handAutoSort = useHandAutoSort();
  const effectPromptPosition = useEffectPromptPosition();
  const [effectSpeed, setEffectSpeedChoice] = useState<EffectSpeed>(getEffectSpeed);
  return (
    <section className="game-arena-board-settings" aria-labelledby={titleId}>
      <h3 id={titleId} className="game-arena-settings__title">
        {t("redesign.arena.board.title")}
      </h3>
      <div className="game-arena-settings__panel">
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
        <div className="game-arena-settings__row game-arena-board-settings__size">
          <label htmlFor={`${titleId}-effect-position`}>{t("settings.effectPromptPosition")}</label>
          <select
            id={`${titleId}-effect-position`}
            value={effectPromptPosition}
            aria-describedby={`${titleId}-effect-position-desc`}
            onChange={(event) => {
              const position = EFFECT_PROMPT_POSITIONS.find((value) => value === event.target.value);
              if (position) setEffectPromptPosition(position);
            }}
          >
            {EFFECT_PROMPT_POSITIONS.map((position) => (
              <option key={position} value={position}>
                {t(position === "center" ? "settings.effectPromptCenter" : "settings.effectPromptLeft")}
              </option>
            ))}
          </select>
          <small id={`${titleId}-effect-position-desc`}>{t("settings.effectPromptPositionDesc")}</small>
        </div>
        {SEQUENTIAL_PACING_ENABLED ? (
          <div className="game-arena-settings__row game-arena-board-settings__size">
            <label htmlFor={`${titleId}-effect-speed`}>{t("settings.effectSpeed")}</label>
            <select
              id={`${titleId}-effect-speed`}
              value={effectSpeed}
              aria-describedby={`${titleId}-effect-speed-desc`}
              onChange={(event) => {
                const speed = EFFECT_SPEEDS.find((value) => value === event.target.value);
                if (!speed) return;
                setEffectSpeed(speed);
                setEffectSpeedChoice(speed);
              }}
            >
              {EFFECT_SPEEDS.map((speed) => (
                <option key={speed} value={speed}>
                  {t(EFFECT_SPEED_LABELS[speed])}
                </option>
              ))}
            </select>
            <small id={`${titleId}-effect-speed-desc`}>{t("settings.effectSpeedDesc")}</small>
          </div>
        ) : null}
        <div className="game-arena-settings__row">
          <Switch
            checked={handAutoSort}
            label={t("settings.handAutoSort")}
            description={t("settings.handAutoSortDesc")}
            onChange={setHandAutoSortEnabled}
          />
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
