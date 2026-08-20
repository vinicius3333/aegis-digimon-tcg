/* Entry flow: choose how to play (Discord account or guest), then pick a handle
   and a Digimon World portrait before the menu. */

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Logo } from "../design/primitives";
import { COLOR_KEYS, type ColorName } from "../design/theme";
import { Icons } from "../design/icons";
import { accountApi } from "../account/client";
import { DIGIMON_WORLD_AVATARS, digimonAvatarUrl, type DigimonWorldAvatarId } from "../account/avatars";
import { APP_VERSION } from "../release";
import { useTranslation } from "../i18n";
import "./onboarding.css";

const ADJ = ["Ashen", "Verdant", "Cobalt", "Gilded", "Umbral", "Tidal", "Ember", "Storm", "Hollow", "Crimson", "Pale", "Iron", "Lunar", "Vesper", "Onyx", "Dawn"];
const NOUN = ["Warden", "Tamer", "Herald", "Drake", "Sentinel", "Augur", "Knell", "Mourner", "Vow", "Cinder", "Reverie", "Oathkeeper", "Wisp", "Sable", "Quill", "Vane"];

export type OnboardingResult = { name: string; color: ColorName; avatarId: DigimonWorldAvatarId | null };

function randomName(): string {
  const a = ADJ[Math.floor(Math.random() * ADJ.length)] ?? "Vesper";
  const n = NOUN[Math.floor(Math.random() * NOUN.length)] ?? "Knell";
  return `${a}${n}`;
}

function randomAvatarId(): DigimonWorldAvatarId {
  const avatar = DIGIMON_WORLD_AVATARS[Math.floor(Math.random() * DIGIMON_WORLD_AVATARS.length)];
  return (avatar ?? DIGIMON_WORLD_AVATARS[0]!).id;
}

/** The portrait replaces the old color swatches, so the identity accent that the
    board still needs is derived from the chosen avatar instead of being picked. */
export function accentForAvatar(avatarId: DigimonWorldAvatarId | null, fallback: ColorName): ColorName {
  if (!avatarId) return fallback;
  let hash = 0;
  for (const char of avatarId) hash = (hash * 31 + char.charCodeAt(0)) % 100_000;
  return COLOR_KEYS[hash % COLOR_KEYS.length] ?? fallback;
}

export function Onboarding({ initialColor = "Blue", onEnter }: { initialColor?: ColorName; onEnter: (identity: OnboardingResult) => void }) {
  const { t } = useTranslation();
  const [step, setStep] = useState<"path" | "profile">("path");
  const [name, setName] = useState("");
  const [avatarId, setAvatarId] = useState<DigimonWorldAvatarId | null>(null);
  const [query, setQuery] = useState("");
  const trimmed = name.trim();
  const valid = trimmed.length >= 2 && trimmed.length <= 16;
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { if (step === "profile") inputRef.current?.focus(); }, [step]);

  const visibleAvatars = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return DIGIMON_WORLD_AVATARS;
    return DIGIMON_WORLD_AVATARS.filter(({ name: avatarName }) => avatarName.toLocaleLowerCase().includes(normalized));
  }, [query]);

  const selectedAvatar = DIGIMON_WORLD_AVATARS.find(({ id }) => id === avatarId);
  const submit = () => { if (valid) onEnter({ name: trimmed, color: accentForAvatar(avatarId, initialColor), avatarId }); };

  const startGuest = () => {
    if (!name) setName(randomName());
    if (!avatarId) setAvatarId(randomAvatarId());
    setStep("profile");
  };

  if (step === "path") {
    return (
      <main className="onboarding-page">
        <section className="onboarding-card onboarding-card--paths">
          <header className="onboarding-head">
            <Logo size={50} />
            <h1>{t("onboarding.welcomeTitle")}</h1>
          </header>

          <div className="onboarding-paths">
            <button
              type="button"
              className="onboarding-path"
              onClick={() => { location.href = `${accountApi.base}/auth/discord`; }}
            >
              <span className="onboarding-path__icon"><Icons.Discord size={24} /></span>
              <span className="onboarding-path__copy">
                <strong>{t("onboarding.discordTitle")}</strong>
                <small>{t("onboarding.discordCopy")}</small>
              </span>
              <Icons.ArrowRight className="onboarding-path__go" size={18} />
            </button>

            <button type="button" className="onboarding-path" onClick={startGuest}>
              <span className="onboarding-path__icon"><Icons.Swords size={24} /></span>
              <span className="onboarding-path__copy">
                <strong>{t("onboarding.guestTitle")}</strong>
                <small>{t("onboarding.guestCopy")}</small>
              </span>
              <Icons.ArrowRight className="onboarding-path__go" size={18} />
            </button>
          </div>

          <p className="onboarding-foot">{t("onboarding.linkLater")}</p>
        </section>

        <div className="onboarding-version">v{APP_VERSION}</div>
      </main>
    );
  }

  return (
    <main className="onboarding-page">
      <section className="onboarding-card onboarding-card--profile">
        <header className="onboarding-head onboarding-head--compact">
          <button type="button" className="onboarding-back" onClick={() => setStep("path")}>
            <Icons.ArrowLeft size={15} />{t("onboarding.back")}
          </button>
          <h1>{t("onboarding.title")}</h1>
        </header>

        <div className="onboarding-profile">
          <div className="onboarding-profile__form">
            <div className="onboarding-preview">
              <span className="onboarding-preview__portrait">
                {avatarId ? <img src={digimonAvatarUrl(avatarId)} alt="" width={96} height={96} decoding="async" /> : <Icons.User size={30} />}
              </span>
              <span className="onboarding-preview__copy">
                <strong>{trimmed || t("onboarding.previewNamePlaceholder")}</strong>
                <small>{selectedAvatar?.name ?? t("onboarding.previewAvatarPlaceholder")}</small>
              </span>
            </div>

            <label className="onboarding-label" htmlFor="onboarding-name">{t("onboarding.nickname")}</label>
            <div className="onboarding-name">
              <input
                id="onboarding-name"
                name="displayName"
                autoComplete="nickname"
                ref={inputRef}
                value={name}
                maxLength={16}
                aria-invalid={Boolean(trimmed) && !valid}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") submit(); }}
                placeholder={t("onboarding.namePlaceholder")}
                data-invalid={Boolean(trimmed) && !valid ? true : undefined}
              />
              <button type="button" className="onboarding-shuffle" onClick={() => setName(randomName())} title={t("onboarding.surpriseMe")}>
                <Icons.Dices size={14} />{t("onboarding.random")}
              </button>
            </div>
            <div className="onboarding-name-meta">
              <span data-invalid={trimmed && !valid ? true : undefined}>{trimmed && !valid ? t("onboarding.nameInvalid") : t("onboarding.nameHint")}</span>
              <span className="onboarding-counter">{name.length}/16</span>
            </div>

            <Button size="lg" full icon={Icons.ArrowRight} disabled={!valid} onClick={submit}>{t("onboarding.enter")}</Button>
          </div>

          <div className="onboarding-profile__portraits">
            <div className="onboarding-avatars-head">
              <label className="onboarding-label" htmlFor="onboarding-avatar-search">{t("onboarding.avatarLabel")}</label>
              <div className="onboarding-avatars-tools">
                <input
                  id="onboarding-avatar-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("onboarding.avatarSearch")}
                />
                <button type="button" className="onboarding-shuffle" onClick={() => setAvatarId(randomAvatarId())}>
                  <Icons.Dices size={14} />{t("onboarding.random")}
                </button>
              </div>
            </div>

            {visibleAvatars.length ? (
              <div className="onboarding-avatars" role="group" aria-label={t("onboarding.avatarGridAria")}>
                {visibleAvatars.map((avatar) => (
                  <button
                    key={avatar.id}
                    type="button"
                    className="onboarding-avatar"
                    aria-pressed={avatar.id === avatarId}
                    aria-label={avatar.name}
                    onClick={() => setAvatarId(avatar.id)}
                  >
                    <img src={digimonAvatarUrl(avatar.id)} alt="" width={72} height={72} loading="lazy" decoding="async" />
                    <span>{avatar.name}</span>
                    {avatar.id === avatarId ? <Icons.Check className="onboarding-avatar__check" size={14} /> : null}
                  </button>
                ))}
              </div>
            ) : (
              <p className="onboarding-avatars-empty" role="status">{t("onboarding.avatarEmpty")}</p>
            )}
          </div>
        </div>
      </section>

      <div className="onboarding-version">v{APP_VERSION}</div>
    </main>
  );
}
