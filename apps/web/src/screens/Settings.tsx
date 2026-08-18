import { useState } from "react";
import { Button, Eyebrow, Field, Panel, Switch, type PlayerIdentity } from "../design/primitives";
import { Icons } from "../design/icons";
import { getSoundVolume, isSoundEnabled, playSound, setSoundEnabled, setSoundVolume } from "../design/sound";
import { areActionConfirmationsEnabled, setActionConfirmationsEnabled } from "../design/actionConfirmation";
import { BattlefieldPicker } from "../design/battlefieldPicker";
import { CardSleevePicker } from "../design/sleevePicker";
import { LOCALES, LOCALE_LABELS, useTranslation } from "../i18n";
import { AccountPanel } from "../account/AccountPanel";
import type { RemoteAccount } from "../account/client";
import { SuccessToast } from "../design/SuccessToast";
import "./settings.css";


export function Settings({ player, account, dark, onToggleDark, onRename, onAccountChange }: { player: PlayerIdentity; account: RemoteAccount | null | undefined; dark: boolean; onToggleDark: (v: boolean) => void; onRename?: (name: string) => void; onAccountChange?: (account: RemoteAccount) => void }) {
  const { t, locale, setLocale } = useTranslation();
  const [nameInput, setNameInput] = useState(player.name);
  const [renameToastKey, setRenameToastKey] = useState<number>();
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [volume, setVolume] = useState(Math.round(getSoundVolume() * 100));
  const [actionConfirmationsOn, setActionConfirmationsOn] = useState(areActionConfirmationsEnabled());
  function confirmRename() {
    const name = nameInput.trim();
    if (!name || name === player.name) return;
    onRename?.(name);
    setRenameToastKey((key) => (key ?? 0) + 1);
  }
  return (
    <main className="settings-page">
      <Eyebrow>{t("settings.eyebrow")}</Eyebrow>
      <h1 className="aegis-page-title">{t("settings.title")}</h1>
      <div className="settings-layout">
        <div className="settings-stack">
          <Panel className="settings-feature-panel settings-account-panel"><AccountPanel account={account} onAccountChange={onAccountChange} /></Panel>
          {account === null ? <Panel className="settings-row settings-row--account">
              <span className="settings-row__icon"><Icons.User size={24} /></span>
              <div className="settings-row__copy">
                <div className="settings-row__title">{t("mobile.settings.account")}</div>
                <div className="settings-row__description">{player.name}</div>
              </div>
              <div className="settings-name-row">
                <Field
                  className="settings-name-field"
                  label={t("mobile.settings.account")}
                  name="displayName"
                  autoComplete="nickname"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                />
                <Button variant="primary" size="sm" onClick={confirmRename}>{t("common.confirm")}</Button>
              </div>
          </Panel> : null}
          <Panel className="settings-row">
            <span className="settings-row__icon"><Icons.Sun size={24} /></span>
            <div className="settings-row__copy">
              <div className="settings-row__title">{t("mobile.settings.darkMode")}</div>
              <div className="settings-row__description">{t("mobile.settings.darkModeDesc")}</div>
            </div>
            <button
              className="settings-theme-toggle"
              aria-pressed={dark}
              onClick={() => onToggleDark(!dark)}
            >
              <span>{dark ? t("settings.themeDark") : t("settings.themeLight")}</span>
            </button>
          </Panel>
          <Panel className="settings-feature-panel">
              <div className="settings-section-heading">
                <div className="settings-section-title">{t("settings.battlefield")}</div>
                <div className="settings-section-description">{t("settings.battlefieldDesc")}</div>
              </div>
              <div className="settings-battlefield-strip"><BattlefieldPicker columns={7} /></div>
          </Panel>
          <Panel className="settings-feature-panel">
              <div className="settings-section-heading">
                <div className="settings-section-title">{t("settings.cardSleeve")}</div>
                <div className="settings-section-description">{t("settings.cardSleeveDesc")}</div>
              </div>
              <div className="settings-sleeve-strip"><CardSleevePicker /></div>
          </Panel>
          <Panel className="settings-row settings-row--action-confirmations">
              <span className="settings-row__icon"><Icons.ShieldCheck size={24} /></span>
              <Switch
                checked={actionConfirmationsOn}
                label={t("settings.actionConfirmations")}
                description={t("settings.actionConfirmationsDesc")}
                onChange={(next) => { setActionConfirmationsEnabled(next); setActionConfirmationsOn(next); }}
              />
          </Panel>
          <Panel className="settings-row settings-row--audio">
              <Switch
                checked={soundOn}
                label={t("settings.sound")}
                description={t("settings.soundDesc")}
                onChange={(next) => { setSoundEnabled(next); setSoundOn(next); if (next) playSound("confirm"); }}
              />
              <div className="settings-divider" />
              <div className="settings-volume" data-disabled={!soundOn || undefined}>
                <div className="settings-volume__heading">
                  <div>{t("settings.volume")}</div>
                  <span>{volume}</span>
                </div>
                <input
                  aria-label={t("settings.volume")}
                  name="soundVolume"
                  type="range"
                  min={0}
                  max={100}
                  value={volume}
                  disabled={!soundOn}
                  onChange={(e) => { const next = Number(e.target.value); setVolume(next); setSoundVolume(next / 100); }}
                  onPointerUp={() => soundOn && playSound("select")}
                  className="settings-volume__control"
                />
              </div>
          </Panel>
          <Panel className="settings-row settings-row--language">
              <div className="settings-section-heading">
                <div className="settings-section-title">{t("settings.language")}</div>
                <div className="settings-section-description">{t("settings.languageDesc")}</div>
              </div>
              <div className="settings-language-list">
                {LOCALES.map((option) => {
                  const on = locale === option;
                  return (
                    <button
                      key={option}
                      onClick={() => setLocale(option)}
                      className="settings-language-option"
                      aria-pressed={on}
                    >
                      {LOCALE_LABELS[option]}
                      {on ? <Icons.Check size={16} /> : null}
                    </button>
                  );
                })}
              </div>
          </Panel>
        </div>
      </div>
      {renameToastKey ? <SuccessToast key={renameToastKey} message={t("settings.usernameUpdated")} onDismiss={() => setRenameToastKey(undefined)} /> : null}
    </main>
  );
}
