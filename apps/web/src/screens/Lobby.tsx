/* Lobby / matchmaking. Pick a deck and enter the queue. "Quick Match" waits for a
   second human client; "Practice vs AI" seats a bot automatically server-side;
   "Private Match" creates or joins a code-locked room. */

import { useCallback, useMemo, useState } from "react";
import {
  bannedPairViolations,
  effectiveCopyLimit as banlistLimit,
  getCardDefinition,
  isBetaOnlyCard,
  sharedCardNumberGroups,
} from "@aegis/shared";
import {
  Alert,
  Button,
  Dialog,
  Eyebrow,
  Field,
  IconButton,
  type PlayerIdentity,
  type Screen,
} from "../design/primitives";
import { CoverThumb } from "../design/cards";
import { COLORS } from "../design/theme";
import { Icons, type IconComponent } from "../design/icons";
import { FAMOUS_DECKS, FAMOUS_DECK_GROUPS, displayCoverCard, selectableDecks, type DeckListing } from "../game/decks";
import { useTranslation, type Translate } from "../i18n";
import { RankedStart } from "../account/RankedStart";
import { RANKED_ENABLED } from "../features";
import { deckLegality } from "./DeckListCard";
import { DeckPicker } from "./DeckPicker";
import { FamousDeckListDialog } from "./FamousDeckListDialog";
import "./lobby.css";

export type StartMode = "casual" | "ranked" | "beta" | "bot" | "private_host" | "private_guest";
export type RandomDeckPool = "mine" | "famous" | "all";

export function deckHasBetaCards(deck: DeckListing): boolean {
  return [...deck.mainDeck, ...deck.eggDeck].some((id) => {
    const card = getCardDefinition(id);
    return card !== undefined && isBetaOnlyCard(card);
  });
}

export function randomDeckPool(
  personalDecks: readonly DeckListing[],
  scope: RandomDeckPool,
  betaAllowed = false,
): DeckListing[] {
  const candidates = scope === "mine" ? personalDecks : scope === "famous" ? FAMOUS_DECKS : selectableDecks(personalDecks);
  const eligible = candidates.filter((deck) => deckLegality(deck).legal && (betaAllowed || !deckHasBetaCards(deck)));
  return [...new Map(eligible.map((deck) => [deck.id, deck])).values()];
}

export function randomDeckId(decks: readonly DeckListing[], random = Math.random): string | undefined {
  if (decks.length === 0) return undefined;
  return decks[Math.floor(random() * decks.length)]?.id;
}

interface Mode {
  key: string;
  title: string;
  desc: string;
  icon: IconComponent;
  meta: string;
  available: boolean;
}

function scrollToActiveDeckCard() {
  const card = document.querySelector<HTMLElement>(".lobby-content .deck-list-card.is-active");
  if (!card) return;
  const collapsedGroup = card.closest("details");
  if (collapsedGroup && !collapsedGroup.open) collapsedGroup.open = true;
  card.scrollIntoView({ block: "center" });
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
  onEditDeck,
  onNav,
  onStart,
  invitedRoomCode,
}: {
  player: PlayerIdentity;
  decks: DeckListing[];
  activeDeckId: string;
  onSelectDeck: (id: string) => void;
  onCopyDeck: (deck: DeckListing) => void;
  onEditDeck?: (deck: DeckListing) => void;
  onNav: (s: Screen) => void;
  onStart: (
    mode: StartMode,
    roomCode?: string,
    botDeckId?: string,
    betaBattleMode?: boolean,
    deckId?: string,
  ) => void;
  /** A code carried in by an invite link; opens the private join form with it filled in. */
  invitedRoomCode?: string;
}) {
  const { t } = useTranslation();
  const MODES = modesFor(t);
  const [mode, setMode] = useState(invitedRoomCode ? "private" : "casual");
  const [betaConfirmation, setBetaConfirmation] = useState<"beta" | "bot" | null>(null);
  const [privateSub, setPrivateSub] = useState<"create" | "join">(invitedRoomCode ? "join" : "create");
  const [roomCodeInput, setRoomCodeInput] = useState(invitedRoomCode ?? "");
  // "" is the random pool; any other value is a famous-deck preset id the bot will play.
  const [botDeckId, setBotDeckId] = useState("");
  const [randomSelected, setRandomSelected] = useState(false);
  const [randomPoolScope, setRandomPoolScope] = useState<RandomDeckPool>("all");
  const [viewedDeck, setViewedDeck] = useState<DeckListing | null>(null);
  // Which modes route an unreleased-card deck into the separate beta queue.
  const betaQueueMode = mode === "casual" || mode === "practice";
  // A private room is invite-only and both seats opt in by sharing the code, so it takes
  // an unreleased-card deck without the queue routing a public match needs.
  const betaAllowed = betaQueueMode || mode === "private";
  const userDecks = useMemo(() => {
    return decks
      .map((deck) => ({
        deck,
        legal: deckLegality(deck).legal && (betaAllowed || !deckHasBetaCards(deck)),
      }))
      .sort((a, b) => Number(b.legal) - Number(a.legal));
  }, [decks, betaAllowed]);
  const editDeck = useCallback(
    (deck: DeckListing) => {
      if (onEditDeck) {
        onEditDeck(deck);
        return;
      }
      onSelectDeck(deck.id);
      onNav("deck");
    },
    [onEditDeck, onSelectDeck, onNav],
  );
  const buildDeck = useCallback(() => onNav("deck"), [onNav]);
  const availableDecks = selectableDecks(decks);
  const active = availableDecks.find((d) => d.id === activeDeckId) ?? availableDecks[0];
  const activeCollection = FAMOUS_DECK_GROUPS.find((group) =>
    group.decks.some((deck) => deck.id === active?.id),
  )?.collection;
  const activeIsPreset = activeCollection !== undefined;
  const ac = COLORS[active?.color ?? "Blue"];
  const vsBot = mode === "practice";
  const banViolations = useMemo(() => {
    if (!active) return [];
    const cardIds = [...active.mainDeck, ...active.eggDeck];
    const counts = new Map<string, number>();
    for (const id of cardIds) counts.set(id, (counts.get(id) ?? 0) + 1);
    const violations = [...counts.entries()]
      .filter(([id, n]) => n > banlistLimit(id))
      .map(([id, n]) => ({ id, n, cap: banlistLimit(id) }));
    for (const [, members] of sharedCardNumberGroups(cardIds)) {
      if (members.length < 2) continue;
      const n = members.reduce((sum, id) => sum + (counts.get(id) ?? 0), 0);
      const cap = Math.min(...members.map(banlistLimit));
      if (n > cap) violations.push({ id: members.join(" + "), n, cap });
    }
    return violations;
  }, [active]);
  const pairViolations = useMemo(
    () => (active ? bannedPairViolations([...active.mainDeck, ...active.eggDeck]) : []),
    [active],
  );
  const betaCards = useMemo(
    () =>
      active
        ? [...new Set([...active.mainDeck, ...active.eggDeck])].filter((id) => {
            const card = getCardDefinition(id);
            return card !== undefined && isBetaOnlyCard(card);
          })
        : [],
    [active],
  );
  const betaEnabled = !randomSelected && betaQueueMode && betaCards.length > 0;
  const deckLegal =
    !!active &&
    active.mainDeck.length === 50 &&
    active.eggDeck.length <= 5 &&
    banViolations.length === 0 &&
    pairViolations.length === 0 &&
    (betaCards.length === 0 || betaAllowed);
  const randomPool = useMemo(
    () => randomDeckPool(decks, randomPoolScope, betaAllowed),
    [decks, randomPoolScope, betaAllowed],
  );
  const randomPoolLabel = t(randomPool.length === 1 ? "lobby.randomPoolOne" : "lobby.randomPool", {
    count: randomPool.length,
  });
  const selectionLegal = randomSelected ? randomPool.length > 0 : deckLegal;
  const selectDeck = useCallback(
    (deckId: string) => {
      setRandomSelected(false);
      onSelectDeck(deckId);
    },
    [onSelectDeck],
  );
  const start = useCallback(
    (startMode: StartMode, code?: string, requestedBotDeckId?: string, requestedBetaBattleMode?: boolean) => {
      if (randomSelected) {
        // Ranked never takes unreleased cards, so a ranked start draws from the released subset.
        const pool = startMode === "ranked" ? randomPool.filter((deck) => !deckHasBetaCards(deck)) : randomPool;
        const drawnId = randomDeckId(pool);
        const drawn = pool.find((deck) => deck.id === drawnId);
        if (!drawn) return;
        const betaBattleMode = betaQueueMode && deckHasBetaCards(drawn) ? true : requestedBetaBattleMode;
        onStart(startMode, code, requestedBotDeckId, betaBattleMode, drawn.id);
        return;
      }
      const selectedDeckId = active?.id;
      if (!selectedDeckId) return;
      if (requestedBetaBattleMode !== undefined) {
        onStart(startMode, code, requestedBotDeckId, requestedBetaBattleMode);
      } else if (requestedBotDeckId !== undefined) {
        onStart(startMode, code, requestedBotDeckId);
      } else if (code !== undefined) {
        onStart(startMode, code);
      } else {
        onStart(startMode);
      }
    },
    [active?.id, betaQueueMode, onStart, randomPool, randomSelected],
  );

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
      {randomSelected ? (
        <div className="lobby-active-strip" aria-label={t("lobby.battleDeck")}>
          <div className="lobby-active-strip__jump">
            <span className="lobby-active-strip__thumb lobby-active-strip__thumb--mystery">
              <Icons.Dices size={22} aria-hidden="true" />
            </span>
            <span className="lobby-active-strip__text">
              <span className="lobby-active-strip__eyebrow">{t("lobby.battleDeck")}</span>
              <span className="lobby-active-strip__name">{t("lobby.randomDeck")}</span>
            </span>
          </div>
          <span className="lobby-active-strip__status">{randomPoolLabel}</span>
        </div>
      ) : active ? (
        <div className="lobby-active-strip" aria-label={t("lobby.battleDeck")}>
          <button type="button" className="lobby-active-strip__jump" onClick={scrollToActiveDeckCard}>
            <span
              className="lobby-active-strip__thumb"
              style={{ background: `linear-gradient(150deg, ${ac.soft}, var(--ds-surface-muted))` }}
            >
              <CoverThumb
                key={displayCoverCard(active)}
                coverCardId={displayCoverCard(active)}
                sigilColor={active.color}
                sigilSize={22}
              />
            </span>
            <span className="lobby-active-strip__text">
              <span className="lobby-active-strip__eyebrow">{t("lobby.battleDeck")}</span>
              <span className="lobby-active-strip__name">{active.name}</span>
            </span>
          </button>
          <span
            className="lobby-active-strip__status"
            style={{ color: deckLegal ? "var(--ds-success)" : "var(--ds-brand-on-ink-muted)" }}
          >
            {active.mainDeck.length} + {active.eggDeck.length}
            {deckLegal ? t("lobby.legal") : t("lobby.draft")}
          </span>
          {activeIsPreset ? (
            <IconButton
              className="lobby-deck-action"
              variant="ghost"
              size="sm"
              label={t("lobby.viewList")}
              onClick={() => setViewedDeck(active)}
            >
              <Icons.Eye size={16} />
            </IconButton>
          ) : null}
          <IconButton
            className="lobby-deck-action"
            variant="ghost"
            size="sm"
            label={t("nav.decks")}
            onClick={() => onNav("deck")}
          >
            <Icons.FileText size={16} />
          </IconButton>
        </div>
      ) : null}
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

        <DeckPicker
          ownDecks={userDecks}
          activeDeckId={activeDeckId}
          randomSelected={randomSelected}
          randomPoolSize={randomPool.length}
          onSelectRandom={() => setRandomSelected(true)}
          onSelectDeck={selectDeck}
          onCopyDeck={onCopyDeck}
          onViewDeck={setViewedDeck}
          onEditDeck={editDeck}
          onBuildDeck={buildDeck}
        />
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
        {randomSelected ? (
          <div className="lobby-mystery-summary">
            <div className="lobby-mystery-summary__cards" aria-hidden="true">
              <Icons.Dices size={34} />
            </div>
            <div>
              <div className="lobby-mystery-summary__title">{t("lobby.randomDeck")}</div>
              <div className="lobby-mystery-summary__pool">{randomPoolLabel}</div>
            </div>
          </div>
        ) : active ? (
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
              {activeIsPreset ? (
                <div style={{ fontSize: 11.5, color: "var(--ds-fg-muted)", marginTop: 2 }}>
                  {t("lobby.presetSource", { collection: activeCollection })}
                </div>
              ) : null}
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
                <>
                  <Button size="sm" variant="secondary" icon={Icons.Eye} onClick={() => setViewedDeck(active)}>
                    {t("lobby.viewList")}
                  </Button>
                  <Button size="sm" variant="secondary" icon={Icons.FileText} onClick={() => onCopyDeck(active)}>
                    {t("lobby.copyPreset")}
                  </Button>
                </>
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
            {randomSelected ? (
              <div className="lobby-random-pool">
                <span id="lobby-random-pool-label">{t("lobby.randomPoolLabel")}</span>
                <div role="group" aria-labelledby="lobby-random-pool-label">
                  {(["mine", "famous", "all"] as const).map((scope) => (
                    <button
                      type="button"
                      key={scope}
                      className={randomPoolScope === scope ? "is-selected" : undefined}
                      aria-pressed={randomPoolScope === scope}
                      onClick={() => setRandomPoolScope(scope)}
                    >
                      {t(`lobby.filter${scope === "mine" ? "Mine" : scope === "famous" ? "Famous" : "All"}`)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          {betaEnabled ? (
            <Alert className="lobby-alert" tone="warning" title={t("lobby.betaBattleMode")}>
              {t("lobby.betaBattleHint")}
            </Alert>
          ) : null}
          {betaCards.length > 0 && !betaAllowed ? (
            <Alert className="lobby-alert" tone="warning" title={t("lobby.betaRequiredTitle")}>
              {t("lobby.betaRequiredHint")}
            </Alert>
          ) : null}
          {banViolations.length > 0 ? (
            <Alert className="lobby-alert" tone="danger" title={t("lobby.banlistTitle")}>
              {banViolations.map(({ id, n, cap }) => (
                <div key={id}>{t("lobby.banlistRow", { cardId: id, count: n, cap })}</div>
              ))}
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
            {randomSelected ? (
              t("lobby.randomQueueNotice")
            ) : active ? (
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
              deckLegal={selectionLegal}
              onSub={setPrivateSub}
              roomCode={roomCodeInput}
              onRoomCode={setRoomCodeInput}
              onStart={(startMode) => {
                if (startMode === "private_guest") {
                  start(startMode, roomCodeInput);
                } else {
                  start(startMode);
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
                      className="lobby-bot-deck-select"
                      value={botDeckId}
                      onChange={(event) => setBotDeckId(event.target.value)}
                      style={{
                        width: "100%",
                        padding: "9px 10px",
                        borderRadius: 10,
                        border: "1px solid var(--ds-border-strong)",
                        background: "var(--ds-surface-raised)",
                        color: "var(--ds-brand-ink)",
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
                      disabled={!selectionLegal}
                      onClick={() =>
                        betaEnabled
                          ? setBetaConfirmation("bot")
                          : start("bot", undefined, botDeckId || undefined, false)
                      }
                    >
                      {t("lobby.playVsBot")}
                    </Button>
                  </div>
                </>
              ) : betaEnabled ? (
                <div className="lobby-launch">
                  <Button
                    size="lg"
                    full
                    icon={Icons.Swords}
                    disabled={!selectionLegal}
                    onClick={() => setBetaConfirmation("beta")}
                  >
                    {t("lobby.enterBetaQueue")}
                  </Button>
                </div>
              ) : RANKED_ENABLED ? (
                <RankedStart
                  disabled={!selectionLegal}
                  actionClassName="lobby-launch"
                  buttonLabel={t("lobby.enterQueue")}
                  onOpenSettings={() => onNav("settings")}
                  onStart={(isRanked) => start(isRanked ? "ranked" : "casual")}
                />
              ) : (
                <div className="lobby-launch">
                  <Button size="lg" full icon={Icons.Swords} disabled={!selectionLegal} onClick={() => start("casual")}>
                    {t("lobby.enterQueue")}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </aside>
      {viewedDeck ? (
        <FamousDeckListDialog
          deck={viewedDeck}
          collection={
            FAMOUS_DECK_GROUPS.find((group) => group.decks.some((deck) => deck.id === viewedDeck.id))?.collection ?? ""
          }
          active={!randomSelected && viewedDeck.id === active?.id}
          onUse={() => {
            selectDeck(viewedDeck.id);
            setViewedDeck(null);
          }}
          onCopy={() => {
            onCopyDeck(viewedDeck);
            setViewedDeck(null);
          }}
          onClose={() => setViewedDeck(null)}
        />
      ) : null}
      {betaConfirmation ? (
        <Dialog labelledBy="lobby-beta-confirm-title" onClose={() => setBetaConfirmation(null)}>
          <h2 id="lobby-beta-confirm-title">{t("lobby.betaConfirmTitle")}</h2>
          <p>{t("lobby.betaConfirmHint", { deck: active?.name ?? "" })}</p>
          <div className="lobby-beta-confirm-actions">
            <Button variant="secondary" onClick={() => setBetaConfirmation(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => {
                const startMode = betaConfirmation;
                setBetaConfirmation(null);
                if (selectionLegal && betaEnabled)
                  start(startMode, undefined, startMode === "bot" ? botDeckId || undefined : undefined, true);
              }}
            >
              {t("common.confirm")}
            </Button>
          </div>
        </Dialog>
      ) : null}
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
