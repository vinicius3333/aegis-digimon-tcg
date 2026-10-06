/* Home v3: the landing pitch, three shortcuts into the main screens, and —
   while they are still a guest — one quiet nudge to connect an account. The
   page itself has no background: the app's bits backdrop shows through. */

import type { ReactNode } from "react";
import { Button } from "../design/primitives";
import { Icons } from "../design/icons";
import { BetaBanner } from "../design/BetaBanner";
import { DISCORD_INVITE_URL, GITHUB_REPO_URL } from "../community";
import { useTranslation } from "../i18n";
import { currentRelease, displayVersion } from "../releases/catalog";
import "./home.css";

export function Home({
  collectionSize,
  signedIn,
  onPlay,
  onBuildDeck,
  onOpenCollection,
  onSignIn,
  onReportBug,
  onOpenReleases,
}: {
  collectionSize: number;
  signedIn: boolean;
  onPlay: () => void;
  onBuildDeck: () => void;
  onOpenCollection: () => void;
  onSignIn: () => void;
  onReportBug?: () => void;
  onOpenReleases?: () => void;
}) {
  const { t } = useTranslation();
  const cardCount = collectionSize.toLocaleString();

  return (
    <main className="home-page">
      <div className="home-page__column">
        <section className="home-hero">
          <div className="home-hero__copy">
            <span className="aegis-eyebrow">{t("home.eyebrow")}</span>
            <h1>{t("home.title")}</h1>
            <p className="home-hero__lede">{t("home.lede", { count: cardCount })}</p>
            <div className="home-hero__actions">
              <Button size="lg" icon={Icons.Play} onClick={onPlay}>
                {t("home.playNow")}
              </Button>
              <Button size="lg" variant="secondary" onClick={onBuildDeck}>
                {t("home.buildDeck")}
              </Button>
            </div>
            <p className="home-hero__note">{t("home.guestNote")}</p>
          </div>
        </section>

        <nav className="home-shortcuts" aria-label={t("home.shortcuts.aria")}>
          <Shortcut
            icon={<Icons.Swords size={20} />}
            title={t("home.shortcuts.play.title")}
            copy={t("home.shortcuts.play.copy")}
            onClick={onPlay}
          />
          <Shortcut
            icon={<Icons.LayoutGrid size={20} />}
            title={t("home.shortcuts.decks.title")}
            copy={t("home.shortcuts.decks.copy")}
            onClick={onBuildDeck}
          />
          <Shortcut
            icon={<Icons.BookOpen size={20} />}
            title={t("home.shortcuts.collection.title", { count: cardCount })}
            copy={t("home.shortcuts.collection.copy")}
            onClick={onOpenCollection}
          />
        </nav>

        {signedIn ? null : (
          <section className="home-signin">
            <span className="home-signin__icon" aria-hidden="true">
              <Icons.Devices size={18} />
            </span>
            <p>
              <strong>{t("home.signInTitle")}</strong> {t("home.signInCopy")}
            </p>
            <Button variant="secondary" size="sm" onClick={onSignIn}>
              {t("home.signInAction")}
            </Button>
          </section>
        )}

        <BetaBanner />
      </div>

      <footer className="home-footer">
        <div className="home-footer__links">
          <a href={DISCORD_INVITE_URL} target="_blank" rel="noreferrer">
            <Icons.Discord size={15} />
            {t("home.footer.discord")}
          </a>
          <a href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">
            <Icons.Github size={15} />
            {t("home.footer.github")}
          </a>
          {onReportBug ? (
            <button type="button" onClick={onReportBug}>
              <Icons.Megaphone size={15} />
              {t("bugReport.button")}
            </button>
          ) : null}
          {onOpenReleases ? (
            <button type="button" onClick={onOpenReleases}>
              <span aria-hidden="true">
                <Icons.Sparkles size={15} />
              </span>
              {displayVersion(currentRelease().version)} · {t("releases.nav")}
            </button>
          ) : null}
        </div>
        <p>{t("home.footer.legal")}</p>
      </footer>
    </main>
  );
}

function Shortcut({
  icon,
  title,
  copy,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  copy: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="home-shortcut" onClick={onClick}>
      <span className="home-shortcut__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="home-shortcut__text">
        <strong>{title}</strong>
        <span>{copy}</span>
      </span>
      <Icons.ArrowRight size={16} aria-hidden="true" />
    </button>
  );
}
