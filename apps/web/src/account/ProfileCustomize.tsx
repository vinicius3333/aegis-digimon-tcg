import { useEffect, useState, type FormEvent } from "react";
import { Avatar, Button, Field, type PlayerIdentity } from "../design/primitives";
import { useTranslation } from "../i18n";
import { AccountApiError, accountApi, type RemoteAccount } from "./client";
import { DIGIMON_WORLD_AVATARS, digimonAvatarUrl, type DigimonWorldAvatarId } from "./avatars";

/** The app router and this draft editor share one cancelable navigation boundary. */
export function allowProfileNavigation() {
  return window.dispatchEvent(new Event("aegis:before-navigation", { cancelable: true }));
}

export function ProfileCustomize({
  account,
  player,
  onAccountChange,
  onGuestChange,
  onRefreshDiscordAvatar,
}: {
  account: RemoteAccount | null;
  player: PlayerIdentity;
  onAccountChange?: (account: RemoteAccount) => void;
  onGuestChange?: (name: string, avatarId: DigimonWorldAvatarId | null) => void;
  onRefreshDiscordAvatar?: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const savedName = account?.displayName ?? player.name;
  const savedAvatar = account ? account.avatarId : (player.guestAvatarId ?? player.avatarId ?? null);
  const [name, setName] = useState(savedName);
  const [avatar, setAvatar] = useState(savedAvatar);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [refresh, setRefresh] = useState<"idle" | "pending" | "done" | "cooldown" | "failed">("idle");
  const dirty = name !== savedName || avatar !== savedAvatar;
  useEffect(() => {
    setName(savedName);
    setAvatar(savedAvatar);
  }, [savedName, savedAvatar]);
  useEffect(() => {
    if (!dirty && !busy && refresh !== "pending") return;
    const confirm = (event: Event) => {
      if (busy || refresh === "pending" || !window.confirm(t("profile.discard"))) event.preventDefault();
      else window.removeEventListener("beforeunload", unload);
    };
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("aegis:before-navigation", confirm);
    window.addEventListener("beforeunload", unload);
    return () => {
      window.removeEventListener("aegis:before-navigation", confirm);
      window.removeEventListener("beforeunload", unload);
    };
  }, [dirty, busy, refresh, t]);
  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy || refresh === "pending" || !dirty) return;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      if (account)
        onAccountChange?.({ ...account, ...(await accountApi.updateProfile({ displayName: name, avatarId: avatar })) });
      else onGuestChange?.(name.trim().replace(/\s+/g, " "), avatar);
      setSaved(true);
    } catch (failure) {
      const code = failure instanceof AccountApiError ? failure.code : undefined;
      setError(
        t(
          code === "display_name_taken"
            ? "account.nickname.taken"
            : code === "too_many_requests"
              ? "account.nickname.rateLimit"
              : code === "invalid_display_name"
                ? "account.nickname.invalid"
                : "account.nickname.error",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  async function refreshDiscord() {
    if (busy || !onRefreshDiscordAvatar || refresh === "pending") return;
    setRefresh("pending");
    try {
      await onRefreshDiscordAvatar();
      setRefresh("done");
    } catch (failure) {
      setRefresh(failure instanceof AccountApiError && failure.status === 429 ? "cooldown" : "failed");
    }
  }
  const avatars = DIGIMON_WORLD_AVATARS.filter(({ name: label }) =>
    label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  return (
    <form className="profile-customize" onSubmit={(event) => void save(event)}>
      <div className="profile-customize__fields">
        <Field
          label={t("account.nickname.label")}
          autoComplete="nickname"
          name="profileName"
          value={name}
          minLength={name === savedName ? undefined : 3}
          maxLength={32}
          required
          disabled={busy}
          hint={t("account.nickname.hint")}
          onChange={(event) => {
            setName(event.target.value);
            setSaved(false);
          }}
        />
        <h2>{t("profile.avatar")}</h2>
        <div className="profile-customize__source">
          <Button
            type="button"
            variant="secondary"
            aria-pressed={avatar === null}
            disabled={busy}
            onClick={() => {
              setAvatar(null);
              setSaved(false);
            }}
          >
            {account?.discordLinked ? "Discord" : t("profile.defaultAvatar")}
          </Button>
          {account?.discordLinked && onRefreshDiscordAvatar ? (
            <Button
              type="button"
              variant="ghost"
              disabled={busy || refresh === "pending"}
              onClick={() => void refreshDiscord()}
            >
              {t("playerMenu.refreshDiscordAvatar")}
            </Button>
          ) : null}
        </div>
        {refresh === "done" ? (
          <p role="status">{t("playerMenu.refreshDiscordAvatarDone")}</p>
        ) : refresh === "cooldown" || refresh === "failed" ? (
          <p role="alert">
            {t(
              refresh === "cooldown"
                ? "playerMenu.refreshDiscordAvatarCooldown"
                : "playerMenu.refreshDiscordAvatarFailed",
            )}
          </p>
        ) : null}
        <Field
          type="search"
          label={t("account.avatar.search")}
          placeholder={t("account.avatar.searchPlaceholder")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="profile-customize__avatars" role="group" aria-label={t("account.avatar.gridAria")}>
          {avatars.map((entry) => (
            <button
              type="button"
              key={entry.id}
              aria-label={t("account.avatar.use", { name: entry.name })}
              aria-pressed={entry.id === avatar}
              disabled={busy}
              onClick={() => {
                setAvatar(entry.id);
                setSaved(false);
              }}
            >
              <img src={digimonAvatarUrl(entry.id)} alt="" width={150} height={158} loading="lazy" />
              <span>{entry.name}</span>
              {entry.id === avatar ? <b aria-hidden="true">✓</b> : null}
            </button>
          ))}
        </div>
        {!avatars.length ? <p role="status">{t("account.avatar.empty")}</p> : null}
        <small>{t("account.avatar.credit")}</small>
      </div>
      <aside className="profile-customize__preview" aria-label={t("profile.preview")}>
        <h2>{t("profile.preview")}</h2>
        <Avatar name={name} avatarId={avatar} avatarUrl={account?.avatarUrl} color={player.color} size={120} />
        <strong>{name || savedName}</strong>
        <p>{t("profile.previewHint")}</p>
      </aside>
      <footer className="profile-customize__actions">
        {error ? <p role="alert">{error}</p> : saved ? <p role="status">{t("profile.saved")}</p> : null}
        <Button
          type="button"
          variant="secondary"
          disabled={busy || !dirty}
          onClick={() => {
            setName(savedName);
            setAvatar(savedAvatar);
            setError("");
            setSaved(false);
          }}
        >
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={busy || refresh === "pending" || !dirty}>
          {t(busy ? "account.nickname.saving" : "profile.save")}
        </Button>
      </footer>
    </form>
  );
}
