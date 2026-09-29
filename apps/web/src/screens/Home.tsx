/* Home v2: a single landing pitch instead of a dashboard. A visitor gets the
   promise, the two things worth doing first, and — while they are still a guest —
   one quiet nudge to connect an account. Decks, collection and stats live behind
   the nav, so nothing is duplicated here. */

import { Button } from "../design/primitives";
import { Icons } from "../design/icons";
import { BetaBanner } from "../design/BetaBanner";
import { Panel } from "../design/surfaces";
import { DISCORD_INVITE_URL, GITHUB_REPO_URL } from "../community";
import { useTranslation } from "../i18n";
import "./home.css";
import { currentRelease, displayVersion } from "../releases/catalog";

export function Home({
  collectionSize,
  signedIn,
  onPlay,
  onBuildDeck,
  onSignIn,
  onReportBug,
  onOpenReleases,
}: {
  collectionSize: number;
  signedIn: boolean;
  onPlay: () => void;
  onBuildDeck: () => void;
  onSignIn: () => void;
  onReportBug?: () => void;
  onOpenReleases?: () => void;
}) {
  const { t } = useTranslation();
  const cardCount = collectionSize.toLocaleString();

  return (
    <main className="home-page">
      <div className="home-page__column">
        <Panel className="home-hero">
          <div className="home-hero__copy">
            <span className="aegis-eyebrow">{t("home.eyebrow")}</span>
            <h1>{t("home.title")}</h1>
            <p className="home-hero__lede aegis-hero-panel__muted">{t("home.lede", { count: cardCount })}</p>
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
        </Panel>

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
              <Icons.MessageSquare size={15} />
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
