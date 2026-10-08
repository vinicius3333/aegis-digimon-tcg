/* The player menu behind the top-bar portrait. For a guest it is the whole account
   surface: who you are on this device, how to keep your decks (sign in), which
   portrait you play as, and the sections that no longer fit the bottom nav. */

import { useMemo, useState } from "react";
import { AccountApiError } from "./client";
import { Avatar, Button, Dialog, type PlayerIdentity, type Screen } from "../design/primitives";
import { Icons, type IconComponent } from "../design/icons";
import { useTranslation } from "../i18n";
import { DISCORD_INVITE_URL, GITHUB_REPO_URL } from "../community";
import { DIGIMON_WORLD_AVATARS, digimonAvatarUrl, type DigimonWorldAvatarId } from "./avatars";
import "./playerMenu.css";

export function PlayerMenu({
  player,
  signedIn,
  selectedAvatarId,
  onSelectAvatar,
  onRefreshDiscordAvatar,
  onNav,
  onSignOut,
  onReportBug,
  onClose,
}: {
  player: PlayerIdentity;
  signedIn: boolean;
  selectedAvatarId: DigimonWorldAvatarId | null;
  onSelectAvatar: (avatarId: DigimonWorldAvatarId | null) => void | Promise<void>;
  /** Present only for an account that signs in with Discord. */
  onRefreshDiscordAvatar?: () => Promise<void>;
  onNav: (screen: Screen) => void;
  onSignOut?: () => void;
  onReportBug?: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [pendingAvatarId, setPendingAvatarId] = useState<DigimonWorldAvatarId | null>();
  const [avatarSaveFailed, setAvatarSaveFailed] = useState(false);
  const [discordRefresh, setDiscordRefresh] = useState<"idle" | "pending" | "done" | "cooldown" | "failed">("idle");

  const avatars = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return DIGIMON_WORLD_AVATARS;
    return DIGIMON_WORLD_AVATARS.filter(({ name }) => name.toLocaleLowerCase().includes(normalized));
  }, [query]);

  const links: { key: string; label: string; icon: IconComponent; action: () => void }[] = [
    { key: "replays", label: t("replay.title"), icon: Icons.PlayCircle, action: () => onNav("replays") },
    { key: "releases", label: t("releases.nav"), icon: Icons.Sparkles, action: () => onNav("releases") },
    { key: "settings", label: t("menu.settings"), icon: Icons.Settings, action: () => onNav("settings") },
  ];

  async function pickAvatar(avatarId: DigimonWorldAvatarId | null) {
    if (pendingAvatarId !== undefined) return;
    setAvatarSaveFailed(false);
    setPendingAvatarId(avatarId);
    try {
      await onSelectAvatar(avatarId);
    } catch {
      setAvatarSaveFailed(true);
    } finally {
      setPendingAvatarId(undefined);
    }
  }

  async function refreshDiscordAvatar() {
    if (!onRefreshDiscordAvatar || discordRefresh === "pending") return;
    setDiscordRefresh("pending");
    try {
      await onRefreshDiscordAvatar();
      setDiscordRefresh("done");
    } catch (error) {
      setDiscordRefresh(error instanceof AccountApiError && error.status === 429 ? "cooldown" : "failed");
    }
  }

  return (
    <Dialog className="player-menu" labelledBy="player-menu-title" onClose={onClose}>
      <header className="player-menu__head aegis-dialog__header">
        <span className="player-menu__portrait">
          <Avatar
            name={player.name}
            color={player.color}
            avatarId={player.avatarId}
            avatarUrl={player.avatarUrl}
            size={52}
          />
        </span>
        <span className="player-menu__identity">
          <h2 id="player-menu-title">{player.name}</h2>
          <small>
            <span className="player-menu__status" data-signed-in={signedIn || undefined} aria-hidden="true" />
            {signedIn ? t("playerMenu.signedIn") : t("playerMenu.guest")}
          </small>
        </span>
        <button
          type="button"
          className="player-menu__close aegis-dialog__close"
          onClick={onClose}
          aria-label={t("common.close")}
        >
          <Icons.X size={16} />
        </button>
      </header>

      {signedIn ? null : (
        <section className="player-menu__signin">
          <Icons.Devices size={24} />
          <p>
            <strong>{t("playerMenu.signInTitle")}</strong> {t("playerMenu.signInCopy")}
          </p>
          <Button
            size="sm"
            icon={Icons.LogIn}
            onClick={() => {
              onClose();
              onNav("login");
            }}
          >
            {t("nav.signIn")}
          </Button>
        </section>
      )}

      <section className="player-menu__avatars" aria-labelledby="player-menu-avatars-title">
        <div className="player-menu__avatars-head">
          <div>
            <h3 id="player-menu-avatars-title">{t("playerMenu.avatarTitle")}</h3>
            <p>{t("playerMenu.avatarCopy")}</p>
          </div>
          <input
            type="search"
            value={query}
            aria-label={t("playerMenu.avatarSearch")}
            placeholder={t("playerMenu.avatarSearch")}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <button
          type="button"
          className="player-menu__account-avatar"
          aria-label={t(signedIn ? "playerMenu.accountAvatar" : "playerMenu.defaultAvatar")}
          aria-pressed={selectedAvatarId === null}
          disabled={pendingAvatarId !== undefined}
          onClick={() => void pickAvatar(null)}
        >
          <Avatar name={player.name} color={player.color} avatarUrl={signedIn ? player.avatarUrl : null} size={40} />
          <span>
            <strong>{t(signedIn ? "playerMenu.accountAvatar" : "playerMenu.defaultAvatar")}</strong>
            <small>{t(signedIn ? "playerMenu.accountAvatarCopy" : "playerMenu.defaultAvatarCopy")}</small>
          </span>
          <span className="player-menu__avatar-check" aria-hidden="true">
            {selectedAvatarId === null ? <Icons.Check size={14} /> : null}
          </span>
        </button>
        {onRefreshDiscordAvatar ? (
          <div className="player-menu__discord-refresh">
            <Button
              size="sm"
              variant="secondary"
              icon={Icons.Discord}
              disabled={discordRefresh === "pending"}
              onClick={() => void refreshDiscordAvatar()}
            >
              {t("playerMenu.refreshDiscordAvatar")}
            </Button>
            {discordRefresh === "done" ? (
              <small role="status">{t("playerMenu.refreshDiscordAvatarDone")}</small>
            ) : discordRefresh === "cooldown" || discordRefresh === "failed" ? (
              <small role="alert" className="player-menu__avatar-error">
                {t(
                  discordRefresh === "cooldown"
                    ? "playerMenu.refreshDiscordAvatarCooldown"
                    : "playerMenu.refreshDiscordAvatarFailed",
                )}
              </small>
            ) : null}
          </div>
        ) : null}
        {avatarSaveFailed ? (
          <p role="alert" className="player-menu__avatar-error">
            {t("playerMenu.avatarSaveFailed")}
          </p>
        ) : null}

        {avatars.length ? (
          <div className="player-menu__avatar-grid" role="group" aria-label={t("playerMenu.avatarGridAria")}>
            {avatars.map((avatar) => (
              <button
                key={avatar.id}
                type="button"
                className="player-menu__avatar"
                aria-pressed={avatar.id === selectedAvatarId}
                aria-label={avatar.name}
                disabled={pendingAvatarId !== undefined}
                onClick={() => void pickAvatar(avatar.id)}
              >
                <img src={digimonAvatarUrl(avatar.id)} alt="" width={72} height={72} loading="lazy" decoding="async" />
                <span>{avatar.name}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="player-menu__empty" role="status">
            {t("playerMenu.avatarEmpty")}
          </p>
        )}
      </section>

      <nav className="player-menu__links" aria-label={t("playerMenu.linksAria")}>
        {links.map((link) => (
          <button
            key={link.key}
            type="button"
            onClick={() => {
              onClose();
              link.action();
            }}
          >
            <link.icon size={18} />
            <span>{link.label}</span>
            <Icons.ChevronRight size={18} />
          </button>
        ))}
        {onReportBug ? (
          <button
            type="button"
            onClick={() => {
              onClose();
              onReportBug();
            }}
          >
            <Icons.Megaphone size={18} />
            <span>{t("bugReport.button")}</span>
            <Icons.ChevronRight size={18} />
          </button>
        ) : null}
        <a href={DISCORD_INVITE_URL} target="_blank" rel="noreferrer">
          <Icons.Discord size={18} />
          <span>{t("home.footer.discord")}</span>
          <Icons.ChevronRight size={18} />
        </a>
        <a href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">
          <Icons.Github size={18} />
          <span>{t("home.footer.github")}</span>
          <Icons.ChevronRight size={18} />
        </a>
        {signedIn && onSignOut ? (
          <button type="button" className="player-menu__sign-out" onClick={onSignOut}>
            <Icons.LogOut size={18} />
            <span>{t("playerMenu.signOut")}</span>
          </button>
        ) : null}
      </nav>
    </Dialog>
  );
}
