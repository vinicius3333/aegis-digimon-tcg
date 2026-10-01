import { useState } from "react";
import { Avatar, Button, Eyebrow, Field, Switch, type PlayerIdentity } from "../design/primitives";
import { Panel, SectionHeading } from "../design/surfaces";
import { ArenaLookSettings } from "../design/ArenaLookSettings";
import { Icons } from "../design/icons";
import { getSoundVolume, isSoundEnabled, playSound, setSoundEnabled, setSoundVolume } from "../design/sound";
import { areActionConfirmationsEnabled, setActionConfirmationsEnabled } from "../design/actionConfirmation";
import { PileLayout, setPileLayout, usePileLayout } from "../design/pileLayout";
import { CardSleevePicker } from "../design/sleevePicker";
import { LOCALES, LOCALE_LABELS, useTranslation } from "../i18n";
import { AccountPanel } from "../account/AccountPanel";
import { DigimonAvatarPicker } from "../account/DigimonAvatarPicker";
import type { DigimonWorldAvatarId } from "../account/avatars";
import type { RemoteAccount } from "../account/client";
import { SuccessToast } from "../design/SuccessToast";
import "./settings.css";

export function Settings({
  player,
  account,
  dark,
  onToggleDark,
  onRename,
  onAccountChange,
  onSelectAvatar,
}: {
  player: PlayerIdentity;
  account: RemoteAccount | null | undefined;
  dark: boolean;
  onToggleDark: (v: boolean) => void;
  onRename?: (name: string) => void;
  onAccountChange?: (account: RemoteAccount) => void;
  onSelectAvatar?: (avatarId: DigimonWorldAvatarId) => void;
}) {
  const { t, locale, setLocale } = useTranslation();
  const [nameInput, setNameInput] = useState(player.name);
  const [renameToastKey, setRenameToastKey] = useState<number>();
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [volume, setVolume] = useState(Math.round(getSoundVolume() * 100));
  const [actionConfirmationsOn, setActionConfirmationsOn] = useState(areActionConfirmationsEnabled());
  const pileLayout = usePileLayout();
  function confirmRename() {
    const name = nameInput.trim();
    if (!name || name === player.name) return;
    onRename?.(name);
    setRenameToastKey((key) => (key ?? 0) + 1);
  }
  const accountStatus = account ? t("account.connected") : account === null ? t("redesign.settings.guest") : null;
  return (
    <main className="settings-page">
      <div className="settings-shell">
        <Panel as="header" className="settings-hero">
          <Avatar
            name={player.name}
            color={player.color}
            avatarId={player.avatarId ?? player.guestAvatarId}
            avatarUrl={player.avatarUrl}
            size={72}
          />
          <div className="settings-hero__copy">
            <Eyebrow>{t("settings.eyebrow")}</Eyebrow>
            <h1 className="aegis-page-title">{t("settings.title")}</h1>
            <p className="aegis-hero-panel__muted settings-hero__identity">
              <span className="settings-hero__name">{player.name}</span>
              {accountStatus ? <span>{accountStatus}</span> : null}
            </p>
          </div>
        </Panel>

        <div className="settings-grid">
          <section className="settings-card settings-card--profile" aria-labelledby="settings-profile-title">
            <SectionHeading id="settings-profile-title" title={t("redesign.settings.profile")} />
            <div className="settings-block">
              <AccountPanel account={account} onAccountChange={onAccountChange} />
            </div>

            {account === null ? (
              <div className="settings-row settings-row--stack">
                <div className="settings-row__copy">
                  <strong>{t("profile.nickname")}</strong>
                  <small>{t("profile.nameHint")}</small>
                </div>
                <div className="settings-name-row">
                  <Field
                    className="settings-name-field"
                    label={t("profile.nickname")}
                    name="displayName"
                    autoComplete="nickname"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                  />
                  <Button variant="primary" size="sm" onClick={confirmRename}>
                    {t("common.confirm")}
                  </Button>
                </div>
              </div>
            ) : null}

            {account === null ? (
              <div className="settings-block">
                <DigimonAvatarPicker
                  selectedAvatarId={player.guestAvatarId ?? null}
                  onSelect={async (avatarId) => onSelectAvatar?.(avatarId)}
                />
              </div>
            ) : null}
          </section>

          <section className="settings-card settings-card--appearance" aria-labelledby="settings-appearance-title">
            <SectionHeading id="settings-appearance-title" title={t("settings.sectionAppearance")} />
            <div className="settings-row">
              <div className="settings-row__copy">
                <strong>{t("mobile.settings.darkMode")}</strong>
                <small>{t("mobile.settings.darkModeDesc")}</small>
              </div>
              <button
                type="button"
                className="settings-theme-toggle"
                aria-pressed={dark}
                onClick={() => onToggleDark(!dark)}
              >
                {dark ? <Icons.Moon size={16} /> : <Icons.Sun size={16} />}
                <span>{dark ? t("settings.themeDark") : t("settings.themeLight")}</span>
              </button>
            </div>

            <div className="settings-row">
              <div className="settings-row__copy">
                <strong>{t("settings.language")}</strong>
                <small>{t("settings.languageDesc")}</small>
              </div>
              <div className="settings-language-list">
                {LOCALES.map((option) => {
                  const on = locale === option;
                  return (
                    <button
                      key={option}
                      type="button"
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
            </div>

            <div className="settings-block">
              <div className="settings-block__heading">
                <strong>{t("settings.cardSleeve")}</strong>
                <small>{t("settings.cardSleeveDesc")}</small>
              </div>
              <CardSleevePicker />
            </div>
          </section>

          <section className="settings-card settings-card--gameplay" aria-labelledby="settings-gameplay-title">
            <SectionHeading id="settings-gameplay-title" title={t("settings.sectionGameplay")} />
            <div className="settings-block">
              <Switch
                checked={soundOn}
                label={t("settings.sound")}
                description={t("settings.soundDesc")}
                onChange={(next) => {
                  setSoundEnabled(next);
                  setSoundOn(next);
                  if (next) playSound("confirm");
                }}
              />
            </div>
            <div className="settings-block settings-volume" data-disabled={!soundOn || undefined}>
              <div className="settings-volume__heading">
                <span>{t("settings.volume")}</span>
                <span className="settings-volume__value">{volume}</span>
              </div>
              <input
                aria-label={t("settings.volume")}
                name="soundVolume"
                type="range"
                min={0}
                max={100}
                value={volume}
                disabled={!soundOn}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setVolume(next);
                  setSoundVolume(next / 100);
                }}
                onPointerUp={() => soundOn && playSound("select")}
                className="settings-volume__control"
              />
            </div>
            <div className="settings-block">
              <Switch
                checked={actionConfirmationsOn}
                label={t("settings.actionConfirmations")}
                description={t("settings.actionConfirmationsDesc")}
                onChange={(next) => {
                  setActionConfirmationsEnabled(next);
                  setActionConfirmationsOn(next);
                }}
              />
            </div>
            <div className="settings-block">
              <Switch
                checked={pileLayout === PileLayout.Tabletop}
                label={t("settings.tabletopLayout")}
                description={t("settings.tabletopLayoutDesc")}
                onChange={(next) => setPileLayout(next ? PileLayout.Tabletop : PileLayout.Classic)}
              />
            </div>
          </section>

          <section className="settings-card settings-card--arena" aria-labelledby="settings-arena-title">
            <SectionHeading id="settings-arena-title" title={t("redesign.settings.arena")} />
            <ArenaLookSettings />
          </section>
        </div>
      </div>
      {renameToastKey ? (
        <SuccessToast
          key={renameToastKey}
          message={t("settings.usernameUpdated")}
          onDismiss={() => setRenameToastKey(undefined)}
        />
      ) : null}
    </main>
  );
}
