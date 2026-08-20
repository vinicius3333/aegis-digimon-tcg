/* Main menu — the "splash" launcher direction: a big lockup, a vertical menu, and
   the loaded-deck card. (The dashboard "command" direction from the design is
   folded away for this pass; the splash is the default the user landed on.) */

import { useState } from "react";
import { Avatar, Button, Logo, type PlayerIdentity, type Screen } from "../design/primitives";
import { CoverThumb, Sigil } from "../design/cards";
import { COLORS } from "../design/theme";
import { Icons, type IconComponent } from "../design/icons";
import { deckBlurbLabel, displayCoverCard, type DeckListing } from "../game/decks";
import { DISCORD_INVITE_URL, GITHUB_REPO_URL } from "../community";
import { BetaBanner } from "../design/BetaBanner";
import { useTranslation } from "../i18n";
import "./home.css";

interface MenuItem {
  key: string;
  label: string;
  desc: string;
  icon: IconComponent;
  primary?: boolean;
  action: () => void;
}

function SplashItem({ item, accent }: { item: MenuItem; accent: { base: string; soft: string } }) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={item.action}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "15px 18px",
        borderRadius: 16,
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
        transition: "transform 150ms, background 150ms, border-color 150ms",
        transform: h ? "translateX(6px)" : "none",
        background: item.primary
          ? h
            ? "var(--ds-primary-hover)"
            : "var(--ds-primary)"
          : h
            ? "var(--ds-surface-muted)"
            : "var(--ds-surface)",
        border: `1px solid ${item.primary ? "transparent" : "var(--ds-border)"}`,
        boxShadow: item.primary ? "var(--ds-shadow-hero)" : "var(--ds-shadow-sm)",
      }}
    >
      <span
        style={{
          display: "grid",
          placeItems: "center",
          width: 42,
          height: 42,
          borderRadius: 12,
          flexShrink: 0,
          background: item.primary ? "rgba(255,255,255,0.16)" : accent.soft,
          color: item.primary ? "#fff" : accent.base,
        }}
      >
        <item.icon size={21} />
      </span>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: "var(--ds-font-display)",
            fontWeight: 700,
            fontSize: 17,
            color: item.primary ? "#fff" : "var(--ds-foreground)",
          }}
        >
          {item.label}
        </div>
        <div
          style={{
            fontSize: 12.5,
            color: item.primary ? "rgba(255,255,255,0.8)" : "var(--ds-foreground-muted)",
            marginTop: 1,
          }}
        >
          {item.desc}
        </div>
      </div>
      <Icons.ChevronRight
        size={20}
        style={{ color: item.primary ? "rgba(255,255,255,0.8)" : "var(--ds-foreground-disabled)" }}
      />
    </button>
  );
}

export function MainMenu({
  player,
  activeDeck,
  collectionSize,
  deckCount,
  onNav,
  onPlay,
}: {
  player: PlayerIdentity;
  activeDeck: DeckListing | undefined;
  collectionSize: number;
  deckCount: number;
  onNav: (s: Screen) => void;
  onPlay: () => void;
}) {
  const { t } = useTranslation();
  const ac = COLORS[activeDeck?.color ?? "Blue"];
  const menu: MenuItem[] = [
    {
      key: "play",
      label: t("menu.quickMatch"),
      desc: t("menu.quickMatchDesc"),
      icon: Icons.Swords,
      primary: true,
      action: onPlay,
    },
    {
      key: "deck",
      label: t("menu.deckBuilder"),
      desc: t("menu.deckBuilderDesc", { count: deckCount }),
      icon: Icons.LayoutDashboard,
      action: () => onNav("deck"),
    },
    {
      key: "collection",
      label: t("menu.collection"),
      desc: t("menu.collectionDesc", { count: collectionSize }),
      icon: Icons.BookOpen,
      action: () => onNav("collection"),
    },
    {
      key: "settings",
      label: t("menu.settings"),
      desc: t("menu.settingsDesc"),
      icon: Icons.Settings,
      action: () => onNav("settings"),
    },
  ];
  const legal = !!activeDeck && activeDeck.mainDeck.length === 50 && activeDeck.eggDeck.length <= 5;
  return (
    <main className="home-page">
      <header className="home-header">
        <div className="home-brand">
          <Logo size={34} />
        </div>
        <div className="home-header-copy">
          <div className="home-greeting">
            {t("menu.greeting")} {player.name}.
          </div>
          <div className="home-player-name">{player.name}</div>
          <p className="home-tagline">{t("menu.tagline")}</p>
        </div>
        <div className="home-identity">
          <span className="home-identity__avatar">
            <Avatar
              name={player.name}
              color={player.color}
              avatarId={player.avatarId}
              avatarUrl={player.avatarUrl}
              size={44}
              ring
            />
          </span>
        </div>
      </header>

      <section className="home-primary-grid">
        <article className={`home-deck-card${activeDeck ? "" : " home-deck-card--empty"}`}>
          <div
            className="home-deck-art"
            style={{ background: `radial-gradient(circle at 30% 20%, ${ac.soft}, transparent 65%)` }}
          >
            {activeDeck ? (
              <CoverThumb coverCardId={displayCoverCard(activeDeck)} sigilColor={activeDeck.color} sigilSize={150} />
            ) : (
              <Sigil emblem="ward" color="Blue" size={150} faded />
            )}
          </div>
          <div className="home-deck-copy">
            <span className="aegis-eyebrow">{t("mobile.home.activeDeck")}</span>
            <h2>{activeDeck?.name ?? t("mobile.home.noDeck")}</h2>
            {activeDeck ? <p>{deckBlurbLabel(t, activeDeck.blurb)}</p> : null}
            <div className="home-deck-counts">
              <span>
                <b>{activeDeck?.mainDeck.length ?? 0}</b>/50 Main
              </span>
              <span>
                <b>{activeDeck?.eggDeck.length ?? 0}</b>/5 Egg
              </span>
              <span className={legal ? "is-legal" : ""}>{legal ? t("mobile.home.ready") : t("mobile.home.draft")}</span>
            </div>
          </div>
          <Button variant="secondary" size="md" icon={Icons.LayoutDashboard} onClick={() => onNav("deck")}>
            {activeDeck ? t("common.edit") : t("mobile.home.buildFirst")}
          </Button>
        </article>

        <article className="home-quick-match">
          <Icons.Swords size={42} />
          <h2>{t("menu.quickMatch")}</h2>
          <p>{t("menu.quickMatchDesc")}</p>
          <Button size="lg" full disabled={!activeDeck} onClick={onPlay}>
            {t("mobile.home.quickMatch")}
          </Button>
        </article>
      </section>

      <section className="home-actions" aria-label={t("menu.actionsAria")}>
        {menu.slice(1).map((m) => (
          <SplashItem key={m.key} item={m} accent={ac} />
        ))}
      </section>

      <section className="home-secondary-grid">
        <a
          className="home-community"
          href={DISCORD_INVITE_URL}
          target="_blank"
          rel="noreferrer"
          aria-label={t("menu.discordAria")}
        >
          <span>
            <Icons.Discord size={24} />
          </span>
          <div>
            <strong>{t("mobile.home.discord")}</strong>
            <small>{t("mobile.home.discordDesc")}</small>
          </div>
          <Icons.ChevronRight size={20} />
        </a>

        <a
          className="home-community"
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noreferrer"
          aria-label={t("menu.githubAria")}
        >
          <span>
            <Icons.Github size={24} />
          </span>
          <div>
            <strong>{t("mobile.home.github")}</strong>
            <small>{t("mobile.home.githubDesc")}</small>
          </div>
          <Icons.ChevronRight size={20} />
        </a>
      </section>

      <footer className="home-legal">
        <span className="home-legal__icon">
          <Icons.ShieldCheck size={18} />
        </span>
        <p>
          <strong>{t("legal.title")}.</strong> {t("legal.body")}
        </p>
      </footer>

      <BetaBanner />
    </main>
  );
}
