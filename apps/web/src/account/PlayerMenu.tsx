/* The player menu behind the top-bar portrait. For a guest it is the whole account
   surface: who you are on this device, how to keep your decks (sign in), which
   portrait you play as, and the sections that no longer fit the bottom nav. */

import { useMemo, useState } from "react";
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
  onNav,
  onSignOut,
  onReportBug,
  onClose,
}: {
  player: PlayerIdentity;
  signedIn: boolean;
  selectedAvatarId: DigimonWorldAvatarId | null;
  onSelectAvatar: (avatarId: DigimonWorldAvatarId) => void | Promise<void>;
  onNav: (screen: Screen) => void;
  onSignOut?: () => void;
  onReportBug?: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [pendingAvatarId, setPendingAvatarId] = useState<DigimonWorldAvatarId>();

  const avatars = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return DIGIMON_WORLD_AVATARS;
    return DIGIMON_WORLD_AVATARS.filter(({ name }) => name.toLocaleLowerCase().includes(normalized));
  }, [query]);

  const links: { key: string; label: string; icon: IconComponent; action: () => void }[] = [
    { key: "settings", label: t("menu.settings"), icon: Icons.Settings, action: () => onNav("settings") },
  ];

  async function pickAvatar(avatarId: DigimonWorldAvatarId) {
    if (pendingAvatarId) return;
    setPendingAvatarId(avatarId);
    try {
      await onSelectAvatar(avatarId);
    } finally {
      setPendingAvatarId(undefined);
    }
  }

  return (
    <Dialog className="player-menu" labelledBy="player-menu-title" onClose={onClose}>
      <header className="player-menu__head">
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
          <small>{signedIn ? t("playerMenu.signedIn") : t("playerMenu.guest")}</small>
        </span>
        <button type="button" className="player-menu__close" onClick={onClose} aria-label={t("common.close")}>
          <Icons.X size={16} />
        </button>
      </header>

      {signedIn ? (
        onSignOut ? (
          <div className="player-menu__account">
            <Button variant="ghost" size="sm" icon={Icons.LogOut} onClick={onSignOut}>
              {t("playerMenu.signOut")}
            </Button>
          </div>
        ) : null
      ) : (
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
            <Icons.Bug size={18} />
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
      </nav>
    </Dialog>
  );
}
