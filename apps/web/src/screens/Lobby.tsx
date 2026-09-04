/* Lobby / matchmaking. Pick a deck and enter the queue. "Quick Match" waits for a
   second human client; "Practice vs AI" seats a bot automatically server-side;
   "Private Match" creates or joins a code-locked room. */

import { useMemo, useState } from "react";
import { bannedPairViolations, effectiveCopyLimit as banlistLimit, getCardDefinition } from "@aegis/shared";
import { Alert, Button, Eyebrow, Field, IconButton, type PlayerIdentity, type Screen } from "../design/primitives";
import { CoverThumb } from "../design/cards";
import { COLORS } from "../design/theme";
import { Icons, type IconComponent } from "../design/icons";
import { FAMOUS_DECK_GROUPS, displayCoverCard, selectableDecks, type DeckListing } from "../game/decks";
import { useTranslation, type Translate } from "../i18n";
import { RankedStart } from "../account/RankedStart";
import { DeckListCard } from "./DeckListCard";
import "./lobby.css";

export type StartMode = "casual" | "ranked" | "bot" | "private_host" | "private_guest";

interface Mode {
  key: string;
  title: string;
  desc: string;
  icon: IconComponent;
  meta: string;
  available: boolean;
}

const modesFor = (t: Translate): Mode[] => [
  {
    key: "casual",
    title: t("lobby.mode.casual"),
    desc: t("lobby.mode.casualDesc"),
    icon: Icons.Swords,
    meta: t("lobby.mode.casualMeta"),
    available: true,
  },
  {
    key: "practice",
    title: t("lobby.mode.practice"),
    desc: t("lobby.mode.practiceDesc"),
    icon: Icons.Bot,
    meta: t("lobby.mode.practiceMeta"),
    available: true,
  },
  {
    key: "private",
    title: t("lobby.mode.private"),
    desc: t("lobby.mode.privateDesc"),
    icon: Icons.Link2,
    meta: t("lobby.mode.privateMeta"),
    available: true,
  },
];

export function Lobby({
  player,
  decks,
  activeDeckId,
  onSelectDeck,
  onCopyDeck,
  onNav,
  onStart,
}: {
  player: PlayerIdentity;
  decks: DeckListing[];
  activeDeckId: string;
  onSelectDeck: (id: string) => void;
  onCopyDeck: (deck: DeckListing) => void;
  onNav: (s: Screen) => void;
  onStart: (mode: StartMode, roomCode?: string, botDeckId?: string) => void;
}) {
  const { t } = useTranslation();
  const MODES = modesFor(t);
  const [mode, setMode] = useState("casual");
  const [privateSub, setPrivateSub] = useState<"create" | "join">("create");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  // "" is the random pool; any other value is a famous-deck preset id the bot will play.
  const [botDeckId, setBotDeckId] = useState("");
  const userDecks = decks;
  const availableDecks = selectableDecks(decks);
  const active = availableDecks.find((d) => d.id === activeDeckId) ?? availableDecks[0];
  const activeIsPreset = FAMOUS_DECK_GROUPS.some((group) => group.decks.some((deck) => deck.id === active?.id));
  const ac = COLORS[active?.color ?? "Blue"];
  const vsBot = mode === "practice";
  const banViolations = useMemo(() => {
    if (!active) return [];
    const counts = new Map<string, number>();
    for (const id of [...active.mainDeck, ...active.eggDeck]) counts.set(id, (counts.get(id) ?? 0) + 1);
    return [...counts.entries()].filter(([id, n]) => n > banlistLimit(id));
  }, [active]);
  const pairViolations = useMemo(
    () => (active ? bannedPairViolations([...active.mainDeck, ...active.eggDeck]) : []),
    [active],
  );
  const deckLegal =
    !!active &&
    active.mainDeck.length === 50 &&
    active.eggDeck.length <= 5 &&
    banViolations.length === 0 &&
    pairViolations.length === 0;

  return (
    <main
      className="lobby-page"
      style={{
        height: "calc(100% - var(--ds-nav-height-wide))",
        display: "grid",
        gridTemplateColumns: "1fr 440px",
        overflow: "hidden",
      }}
    >
      <div className="lobby-content" style={{ padding: "28px 32px", overflowY: "auto" }}>
        <Eyebrow>{t("lobby.eyebrow")}</Eyebrow>
        <h1
          style={{
            fontFamily: "var(--ds-font-display)",
            fontWeight: 800,
            fontSize: 34,
            letterSpacing: "-0.02em",
            margin: "10px 0 22px",
            color: "var(--ds-fg)",
          }}
        >
          {t("lobby.title")}
        </h1>

        <div
          className="lobby-modes"
          style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 30 }}
        >
          {MODES.map((m) => {
            const sel = mode === m.key;
            const Icon = m.icon;
            return (
              <button
                type="button"
                key={m.key}
                className={`lobby-mode${sel ? " is-selected" : ""}`}
                disabled={!m.available}
                aria-pressed={sel}
                onClick={() => m.available && setMode(m.key)}
                style={{
                  padding: 20,
                  borderRadius: 18,
                  cursor: m.available ? "pointer" : "not-allowed",
                  position: "relative",
                  opacity: m.available ? 1 : 0.55,
                  background: "var(--ds-surface)",
                  border: `2px solid ${sel ? "var(--ds-accent)" : "var(--ds-border)"}`,
                  boxShadow: sel ? "var(--ds-shadow-md)" : "var(--ds-shadow-sm)",
                  transition: "border-color 150ms",
                }}
              >
                <div className="lobby-mode__header">
                  <span className="lobby-mode__icon">
                    <Icon size={22} />
                  </span>
                  {sel ? (
                    <Icons.CircleCheck className="lobby-mode__selected-mark" size={20} aria-hidden="true" />
                  ) : null}
                </div>
                <div className="lobby-mode__title">{m.title}</div>
                <p className="lobby-mode__description">{m.desc}</p>
                <span className="lobby-mode__meta">
                  <Icons.Clock size={12} />
                  {m.meta}
                </span>
              </button>
            );
          })}
        </div>

        <section aria-label={t("lobby.yourDecks")}>
          <Eyebrow color="var(--ds-fg-muted)">{t("lobby.yourDecks")}</Eyebrow>
          {userDecks.length === 0 ? (
            <div
              style={{
                marginTop: 14,
                padding: "18px 20px",
                borderRadius: 16,
                border: "1.5px dashed var(--ds-border)",
                color: "var(--ds-fg-muted)",
                fontSize: 13,
                textAlign: "center",
                lineHeight: 1.6,
              }}
            >
              {t("lobby.noDecks")}{" "}
              <button type="button" className="aegis-text-action" onClick={() => onNav("deck")}>
                {t("lobby.noDecksLink")}
              </button>
              .
            </div>
          ) : (
            <div
              className="lobby-decks"
              style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14, marginTop: 14 }}
            >
              {userDecks.map((deck) => (
                <DeckListCard
                  key={deck.id}
                  deck={deck}
                  active={deck.id === activeDeckId}
                  compact
                  onSelect={() => onSelectDeck(deck.id)}
                />
              ))}
            </div>
          )}
        </section>

        <section className="lobby-famous" aria-labelledby="lobby-famous-title">
          <header className="lobby-famous__header">
            <h2 id="lobby-famous-title">{t("lobby.famousDecks")}</h2>
            <p>{t("lobby.famousDecksDesc")}</p>
          </header>
          {FAMOUS_DECK_GROUPS.map((group, index) => {
            const headingId = `famous-${group.collection.toLowerCase()}`;
            return (
              <section className="lobby-famous__group" aria-labelledby={headingId} key={group.collection}>
                <details open={index === 0}>
                  <summary className="lobby-famous__summary">
                    <img
                      className="lobby-famous__set"
                      src={`/sets/${group.collection}.jpg`}
                      alt=""
                      aria-hidden="true"
                    />
                    <h3 id={headingId}>{group.collection}</h3>
                    <span className="lobby-famous__count">{t("lobby.deckCount", { count: group.decks.length })}</span>
                    <Icons.ChevronDown className="lobby-famous__chevron" size={16} />
                  </summary>
                  <div className="lobby-decks">
                    {group.decks.map((deck) => (
                      <DeckListCard
                        key={deck.id}
                        deck={deck}
                        active={deck.id === activeDeckId}
                        compact
                        onSelect={() => onSelectDeck(deck.id)}
                      />
                    ))}
                  </div>
                </details>
              </section>
            );
          })}
        </section>
      </div>

      <aside
        className="lobby-summary"
        style={{
          borderLeft: "1px solid var(--ds-border)",
          background: "var(--ds-surface)",
          padding: 24,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Eyebrow color="var(--ds-fg-muted)">{t("lobby.battleDeck")}</Eyebrow>
        {active ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 13, alignItems: "center", margin: "14px 0 18px" }}>
            <div
              style={{
                width: 52,
                height: 52,
                flexShrink: 0,
                borderRadius: 13,
                overflow: "hidden",
                background: `linear-gradient(150deg, ${ac.soft}, var(--ds-surface-muted))`,
                border: `1px solid ${ac.edge}66`,
                display: "grid",
                placeItems: "center",
              }}
            >
              <CoverThumb
                key={displayCoverCard(active)}
                coverCardId={displayCoverCard(active)}
                sigilColor={active.color}
                sigilSize={32}
              />
            </div>
            <div style={{ flex: 1, minWidth: 150 }}>
              <div
                style={{ fontFamily: "var(--ds-font-display)", fontWeight: 700, fontSize: 18, color: "var(--ds-fg)" }}
              >
                {active.name}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                <span style={{ width: 9, height: 9, flexShrink: 0, borderRadius: "50%", background: ac.base }} />
                <span
                  style={{
                    fontFamily: "var(--ds-font-mono)",
                    fontSize: 11.5,
                    whiteSpace: "nowrap",
                    color: deckLegal ? "var(--ds-success)" : "var(--ds-fg-muted)",
                  }}
                >
                  {active.mainDeck.length} + {active.eggDeck.length}
                  {deckLegal
                    ? t("lobby.legal")
                    : pairViolations.length > 0 || banViolations.length > 0
                      ? t("lobby.banlistIssue")
                      : t("lobby.draft")}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: "auto" }}>
              <IconButton
                className="lobby-deck-action"
                variant="ghost"
                size="sm"
                label={t("nav.decks")}
                onClick={() => onNav("deck")}
              >
                <Icons.FileText size={16} />
              </IconButton>
              {activeIsPreset ? (
                <Button size="sm" variant="secondary" icon={Icons.FileText} onClick={() => onCopyDeck(active)}>
                  {t("lobby.copyPreset")}
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <div
            style={{
              margin: "14px 0 18px",
              padding: "16px",
              borderRadius: 14,
              border: "1.5px dashed var(--ds-border)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 13, color: "var(--ds-fg-muted)", lineHeight: 1.6, marginBottom: 12 }}>
              {t("lobby.noDeckSelected")}
            </div>
            <Button size="sm" variant="secondary" icon={Icons.Plus} onClick={() => onNav("deck")}>
              {t("lobby.buildDeck")}
            </Button>
          </div>
        )}

        <div style={{ height: 1, background: "var(--ds-border)", margin: "4px 0 18px" }} />

        <div style={{ flex: 1 }}>
          {banViolations.length > 0 ? (
            <Alert className="lobby-alert" tone="danger" title={t("lobby.banlistTitle")}>
              {banViolations.map(([id, n]) => {
                const cap = banlistLimit(id);
                return <div key={id}>{t("lobby.banlistRow", { cardId: id, count: n, cap })}</div>;
              })}
            </Alert>
          ) : null}
          {pairViolations.length > 0 ? (
            <Alert className="lobby-alert" tone="danger" title={t("lobby.pairTitle")}>
              {pairViolations.map(([a, b]) => (
                <div key={`${a}-${b}`}>
                  {t("lobby.pairRow", { a: getCardDefinition(a)?.nameEn ?? a, b: getCardDefinition(b)?.nameEn ?? b })}
                </div>
              ))}
            </Alert>
          ) : null}
          <div style={{ fontSize: 13.5, color: "var(--ds-fg-secondary)", lineHeight: 1.6, marginBottom: 20 }}>
            {active ? (
              <>
                {t("lobby.queueNoticePrefix")}
                <strong style={{ color: "var(--ds-fg)" }}>{MODES.find((m) => m.key === mode)?.title}</strong>
                {t("lobby.queueNoticeSuffix", { deck: active.name })}
              </>
            ) : (
              t("lobby.buildFirst")
            )}
          </div>

          {mode === "private" ? (
            <PrivateSidebar
              t={t}
              sub={privateSub}
              deckLegal={deckLegal}
              onSub={setPrivateSub}
              roomCode={roomCodeInput}
              onRoomCode={setRoomCodeInput}
              onStart={(startMode) => {
                if (startMode === "private_guest") {
                  onStart(startMode, roomCodeInput);
                } else {
                  onStart(startMode);
                }
              }}
            />
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 22 }}>
                {[
                  [t("lobby.format"), t("lobby.formatValue")],
                  [t("lobby.players"), vsBot ? t("lobby.playersBot") : t("lobby.playersHuman")],
                  [t("lobby.identity"), player.name],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: "var(--ds-fg-muted)" }}>{k}</span>
                    <span style={{ color: "var(--ds-fg)", fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>
              {vsBot ? (
                <>
                  <div style={{ marginBottom: 18 }}>
                    <label
                      htmlFor="lobby-bot-deck"
                      style={{
                        display: "block",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--ds-fg-muted)",
                        marginBottom: 6,
                      }}
                    >
                      {t("lobby.botDeck")}
                    </label>
                    <select
                      id="lobby-bot-deck"
                      value={botDeckId}
                      onChange={(event) => setBotDeckId(event.target.value)}
                      style={{
                        width: "100%",
                        padding: "9px 10px",
                        borderRadius: 10,
                        border: "1px solid var(--ds-border-strong)",
                        background: "var(--ds-surface-raised)",
                        color: "var(--ds-fg)",
                        fontSize: 13,
                        fontFamily: "var(--ds-font-body)",
                        outline: "none",
                        cursor: "pointer",
                      }}
                    >
                      <option value="">{t("lobby.botDeckRandom")}</option>
                      {FAMOUS_DECK_GROUPS.map((group) => (
                        <optgroup key={group.collection} label={group.collection}>
                          {group.decks.map((deck) => (
                            <option key={deck.id} value={deck.id}>
                              {deck.name}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div className="lobby-launch">
                    <Button
                      size="lg"
                      full
                      icon={Icons.Bot}
                      disabled={!deckLegal}
                      onClick={() => onStart("bot", undefined, botDeckId || undefined)}
                    >
                      {t("lobby.playVsBot")}
                    </Button>
                  </div>
                </>
              ) : (
                <RankedStart
                  disabled={!deckLegal}
                  actionClassName="lobby-launch"
                  buttonLabel={t("lobby.enterQueue")}
                  onOpenSettings={() => onNav("settings")}
                  onStart={(isRanked) => onStart(isRanked ? "ranked" : "casual")}
                />
              )}
            </>
          )}
        </div>
      </aside>
    </main>
  );
}

function PrivateSidebar({
  t,
  sub,
  deckLegal,
  onSub,
  roomCode,
  onRoomCode,
  onStart,
}: {
  t: Translate;
  sub: "create" | "join";
  deckLegal: boolean;
  onSub: (s: "create" | "join") => void;
  roomCode: string;
  onRoomCode: (c: string) => void;
  onStart: (mode: StartMode) => void;
}) {
  return (
    <>
      <div className="lobby-private-toggle" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={sub === "create"}
          className={sub === "create" ? "is-selected" : undefined}
          onClick={() => onSub("create")}
        >
          {t("lobby.create")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={sub === "join"}
          className={sub === "join" ? "is-selected" : undefined}
          onClick={() => onSub("join")}
        >
          {t("lobby.join")}
        </button>
      </div>

      {sub === "create" ? (
        <>
          <p style={{ fontSize: 12.5, color: "var(--ds-fg-muted)", lineHeight: 1.5, marginBottom: 16 }}>
            {t("lobby.createHint")}
          </p>
          <div className="lobby-launch">
            <Button size="lg" full icon={Icons.Link2} disabled={!deckLegal} onClick={() => onStart("private_host")}>
              {t("lobby.createRoom")}
            </Button>
          </div>
        </>
      ) : (
        <>
          <p style={{ fontSize: 12.5, color: "var(--ds-fg-muted)", lineHeight: 1.5, marginBottom: 16 }}>
            {t("lobby.joinHint")}
          </p>
          <Field
            className="lobby-room-field"
            label={t("lobby.roomCodePlaceholder")}
            name="roomCode"
            autoComplete="off"
            spellCheck={false}
            value={roomCode}
            onChange={(e) => onRoomCode(e.target.value.toUpperCase())}
            placeholder={t("lobby.roomCodePlaceholder")}
            maxLength={6}
          />
          <div className="lobby-launch">
            <Button
              size="lg"
              full
              icon={Icons.LogIn}
              disabled={!deckLegal || roomCode.length < 4}
              onClick={() => onStart("private_guest")}
            >
              {t("lobby.joinRoom")}
            </Button>
          </div>
        </>
      )}
    </>
  );
}
