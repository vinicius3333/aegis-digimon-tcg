import { useId } from "react";
import { useTranslation, type TranslationKey } from "../i18n";
import { Icons } from "./icons";
import { Dialog } from "./primitives";
import { getInterfaceColors, setCustomInterfaceColor, setInterfaceTheme, useInterfaceTheme } from "./interfaceTheme";
import { isBoardThemeId, presetColors, THEME_PRESETS, type InterfaceColors } from "./interfaceThemeColors";
import "./InterfaceThemePicker.css";
import { ThemeBits } from "./ThemeBits";
import { arenaPaletteById, type ArenaDeckColors } from "./arenaPalette";

const COLOR_LABELS: Record<keyof InterfaceColors, TranslationKey> = {
  accent: "redesign.shell.theme.accent",
  background: "redesign.shell.theme.background",
  surface: "redesign.shell.theme.surface",
  text: "redesign.shell.theme.text",
  header: "redesign.shell.theme.header",
};

export function InterfaceThemePicker({
  dark,
  onToggleDark,
  deckColors,
}: {
  dark: boolean;
  onToggleDark: (dark: boolean) => void;
  deckColors?: ArenaDeckColors;
}) {
  const { t } = useTranslation();
  const preference = useInterfaceTheme();
  const id = useId();
  const colors = getInterfaceColors(dark);
  return (
    <div className="aegis-theme-picker">
      <fieldset className="aegis-theme-picker__section">
        <legend>{t("redesign.shell.theme.mode")}</legend>
        <div className="aegis-theme-picker__modes">
          {[false, true].map((isDark) => (
            <label key={String(isDark)} className="aegis-theme-picker__choice">
              <input type="radio" name={`${id}-mode`} checked={dark === isDark} onChange={() => onToggleDark(isDark)} />
              {isDark ? <Icons.Moon size={16} /> : <Icons.Sun size={16} />}
              <span>{t(isDark ? "settings.themeDark" : "settings.themeLight")}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="aegis-theme-picker__section">
        <legend>{t("redesign.shell.theme.presets")}</legend>
        <div className="aegis-theme-picker__presets">
          {[...THEME_PRESETS, { id: "custom" as const, name: t("redesign.shell.theme.custom") }].map((preset) => {
            let palette =
              preset.id === "custom" ? preference.custom[dark ? "dark" : "light"] : presetColors(preset.id, dark);
            const label = isBoardThemeId(preset.id) ? t(`redesign.foundation.arena.palette.${preset.id}`) : preset.name;
            if (isBoardThemeId(preset.id)) {
              const board = arenaPaletteById(preset.id, deckColors);
              palette = { ...palette, accent: board.player[0], text: board.opponent[0] };
            }
            return (
              <label key={preset.id} className="aegis-theme-picker__choice aegis-theme-picker__preset">
                <input
                  type="radio"
                  name={`${id}-preset`}
                  checked={preference.preset === preset.id}
                  onChange={() => setInterfaceTheme(preset.id)}
                />
                <ThemeBits colors={palette} seed={preset.id} />
                <span className="aegis-theme-picker__preset-heading">{label}</span>
                <span className="aegis-theme-picker__check" aria-hidden="true">
                  <Icons.Check size={14} />
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <details className="aegis-theme-picker__custom" open={preference.preset === "custom" || undefined}>
        <summary>{t("redesign.shell.theme.customize")}</summary>
        <p>{t("redesign.shell.theme.contrast")}</p>
        <div className="aegis-theme-picker__colors">
          {Object.entries(COLOR_LABELS).map(([key, label]) => (
            <label key={key} className="aegis-theme-picker__color">
              <span>{t(label)}</span>
              <input
                type="color"
                value={colors[key as keyof InterfaceColors]}
                onChange={(event) => setCustomInterfaceColor(key as keyof InterfaceColors, event.target.value)}
              />
            </label>
          ))}
        </div>
      </details>

      <div className="aegis-theme-picker__footer">
        <p>{t("redesign.shell.theme.saved")}</p>
      </div>
    </div>
  );
}

export function InterfaceThemeDialog({
  dark,
  onToggleDark,
  onClose,
}: {
  dark: boolean;
  onToggleDark: (dark: boolean) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const titleId = useId();
  return (
    <Dialog labelledBy={titleId} onClose={onClose} className="aegis-theme-dialog">
      <header className="aegis-dialog__header aegis-theme-dialog__header">
        <div>
          <h2 id={titleId}>{t("redesign.shell.theme.title")}</h2>
          <p>{t("redesign.shell.theme.description")}</p>
        </div>
        <button type="button" className="aegis-dialog__close" onClick={onClose} aria-label={t("common.close")}>
          <Icons.X size={18} />
        </button>
      </header>
      <InterfaceThemePicker dark={dark} onToggleDark={onToggleDark} />
    </Dialog>
  );
}
